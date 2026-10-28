import type { DuckDBConnection } from '@duckdb/node-api';
import type { GeometryBoundingBox } from '@spectralcodex/shared/schemas';

import { getCachePaths } from '@spectralcodex/shared/paths';
import {
	createProgress,
	formatCount,
	formatError,
	getCollectionEntries,
	log,
	UserError,
	withAstroContent,
	withSpinner,
} from '@xsynaptic/astro-scripts';
import path from 'node:path';

import type { DivisionItem, RegionMetadata } from '#map-divisions/types.ts';

import { parseRegionData, resolveBoundingBox } from '#map-divisions/content.ts';
import { fetchDivisionData, initializeDuckDB } from '#map-divisions/duckdb.ts';
import { convertToFeatureCollection, saveDivisionMask } from '#map-divisions/geojson.ts';
import { saveSvg } from '#map-divisions/svg.ts';
import { runCommand } from '#shared/command.ts';
import { isExistingFile, safelyCreateDirectory } from '#shared/files.ts';

const stacCatalogUrl = 'https://stac.overturemaps.org/catalog.json';
const s3Base = 's3://overturemaps-us-west-2/release';

interface RegionProcessingNeeds {
	needsGeometry: boolean;
	needsSvg: boolean;
	region: RegionMetadata;
}

interface ProcessingContext {
	cachePath: string;
	db: DuckDBConnection;
	overtureUrl: string;
	regionsById: Map<string, RegionMetadata>;
}

async function resolveLatestRelease(signal: AbortSignal) {
	const response = await fetch(stacCatalogUrl, { signal });
	const catalog = (await response.json()) as { latest: string };

	return catalog.latest;
}

async function isMissingDivisionCache(divisionIds: Array<string>, cachePath: string) {
	for (const divisionId of divisionIds) {
		if (!(await isExistingFile(path.join(cachePath, `${divisionId}.geojson`)))) return true;
	}

	return false;
}

async function collectProcessingNeeds(
	regions: Array<RegionMetadata>,
	{ cachePath, isRegenerate }: { cachePath: string; isRegenerate: boolean },
) {
	const processingNeeds: Array<RegionProcessingNeeds> = [];

	for (const region of regions) {
		const isNeedsGeometry =
			isRegenerate ||
			!(await isExistingFile(path.join(cachePath, `${region.id}.json`))) ||
			(await isMissingDivisionCache(region.divisionIds, cachePath));
		const isNeedsSvg =
			isNeedsGeometry || !(await isExistingFile(path.join(cachePath, `${region.id}.svg`)));

		if (isNeedsGeometry || isNeedsSvg) {
			processingNeeds.push({ needsGeometry: isNeedsGeometry, needsSvg: isNeedsSvg, region });
		}
	}

	return processingNeeds;
}

async function didProcessRegion(
	{ needsGeometry, needsSvg, region }: RegionProcessingNeeds,
	{
		cachePath,
		divisionsById,
		regionsById,
	}: Pick<ProcessingContext, 'cachePath' | 'regionsById'> & {
		divisionsById: Map<string, DivisionItem>;
	},
) {
	const divisionItems: Array<DivisionItem> = [];

	for (const divisionId of region.divisionIds) {
		const divisionItem = divisionsById.get(divisionId);

		if (!divisionItem) {
			log.warn(`No division data found for ${divisionId} (${region.id})`);
			continue;
		}

		divisionItems.push(divisionItem);
	}

	if (divisionItems.length === 0) return false;

	const divisionFeatureCollection = convertToFeatureCollection(divisionItems);

	if (needsGeometry) {
		await saveDivisionMask(divisionFeatureCollection, region.id, cachePath);
	}

	if (needsSvg) {
		const divisionClippingBBox = resolveBoundingBox(region, regionsById, 'divisionClippingBBox');

		await saveSvg({
			geojsonData: divisionFeatureCollection,
			id: region.id,
			options: divisionClippingBBox ? { divisionClippingBBox } : {},
			outputDir: cachePath,
		});
	}

	return true;
}

// A single Overture query serves every region sharing a selection bbox
function groupNeedsBySelectionBBox(
	processingNeeds: Array<RegionProcessingNeeds>,
	regionsById: Map<string, RegionMetadata>,
) {
	const needsBySelectionBBox = new Map<string, Array<RegionProcessingNeeds>>();

	for (const needs of processingNeeds) {
		const selectionBBox = resolveBoundingBox(needs.region, regionsById, 'divisionSelectionBBox');

		if (!selectionBBox) {
			log.warn(`No selection bbox found for ${needs.region.id} or its ancestors`);
			continue;
		}

		const bboxKey = JSON.stringify(selectionBBox);
		const group = needsBySelectionBBox.get(bboxKey);

		if (group) {
			group.push(needs);
		} else {
			needsBySelectionBBox.set(bboxKey, [needs]);
		}
	}

	return needsBySelectionBBox;
}

async function isRegionProcessed(
	needs: RegionProcessingNeeds,
	context: Pick<ProcessingContext, 'cachePath' | 'regionsById'> & {
		divisionsById: Map<string, DivisionItem>;
	},
) {
	try {
		return await didProcessRegion(needs, context);
	} catch (error) {
		log.error(`Failed to process ${needs.region.id}: ${formatError(error)}`);

		return false;
	}
}

async function processRegions(
	processingNeeds: Array<RegionProcessingNeeds>,
	{ signal, ...context }: ProcessingContext & { signal: AbortSignal },
) {
	const needsBySelectionBBox = groupNeedsBySelectionBBox(processingNeeds, context.regionsById);
	const counts = { failed: 0, processed: 0 };
	const progress = createProgress({ label: 'Processing', total: processingNeeds.length });

	for (const [bboxKey, bboxNeeds] of needsBySelectionBBox) {
		signal.throwIfAborted();

		const divisionsById = await fetchDivisionData({
			cachePath: context.cachePath,
			db: context.db,
			divisionIds: new Set(bboxNeeds.flatMap(({ region }) => region.divisionIds)),
			overtureUrl: context.overtureUrl,
			selectionBBox: JSON.parse(bboxKey) as GeometryBoundingBox,
		});

		for (const needs of bboxNeeds) {
			if (await isRegionProcessed(needs, { ...context, divisionsById })) {
				counts.processed++;
			} else {
				counts.failed++;
			}

			progress.tick();
		}
	}

	if (counts.failed > 0) {
		progress.warn();
	} else {
		progress.succeed();
	}

	return counts;
}

await runCommand({
	name: 'map-divisions',
	options: {
		regenerate: {
			default: false,
			description: 'Rebuild every mask and SVG, even when cached',
			short: 'r',
			type: 'boolean',
		},
	},
	async run({ paths, signal, values }) {
		const { divisionsPath: cachePath } = getCachePaths(paths.cachePath);

		const regionEntries = await withSpinner('Loading content', () =>
			withAstroContent((content) => getCollectionEntries(content, ['regions'])),
		);

		const { allRegions, regionsWithDivisionIds } = parseRegionData(regionEntries);

		if (regionsWithDivisionIds.length === 0) {
			log.warn('No regions with division IDs found');
			return;
		}

		safelyCreateDirectory(cachePath);

		const processingNeeds = await collectProcessingNeeds(regionsWithDivisionIds, {
			cachePath,
			isRegenerate: values.regenerate,
		});
		const cachedCount = regionsWithDivisionIds.length - processingNeeds.length;

		if (processingNeeds.length === 0) {
			log.success(`All ${formatCount(cachedCount)} regions already cached`);
			return;
		}

		const version = await withSpinner(
			'Resolving the latest Overture Maps release',
			() => resolveLatestRelease(signal),
			(resolved) => `Overture Maps release ${resolved}`,
		);
		const db = await withSpinner('Initializing DuckDB', initializeDuckDB);

		try {
			const counts = await processRegions(processingNeeds, {
				cachePath,
				db,
				overtureUrl: `${s3Base}/${version}/`,
				regionsById: new Map(allRegions.map((region) => [region.id, region])),
				signal,
			});

			log.summary([
				['Regions', regionsWithDivisionIds.length],
				['Processed', counts.processed],
				['Already cached', cachedCount],
				['Failed', counts.failed],
			]);
			log.detail(`Output: ${cachePath}`);

			if (counts.failed > 0) {
				throw new UserError(`${formatCount(counts.failed)} region(s) failed to process`);
			}
		} finally {
			db.disconnectSync();
		}
	},
	summary: 'Fetch Overture Maps division boundaries and render each Region’s mask and SVG',
	title: 'Map divisions',
});
