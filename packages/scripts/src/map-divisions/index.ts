#!/usr/bin/env tsx
import type { DuckDBConnection } from '@duckdb/node-api';
import type { GeometryBoundingBox } from '@spectralcodex/shared/map';

import chalk from 'chalk';
import path from 'node:path';
import { parseArgs } from 'node:util';

import type { DivisionFeatureCollection, DivisionItem, RegionMetadata } from './types';

const stacCatalogUrl = 'https://stac.overturemaps.org/catalog.json';
const s3Base = 's3://overturemaps-us-west-2/release';

async function resolveLatestRelease(): Promise<string> {
	const response = await fetch(stacCatalogUrl);
	const catalog = (await response.json()) as { latest: string };
	const version = catalog.latest;

	console.log(chalk.green(`Resolved latest Overture Maps release: ${chalk.cyan(version)}`));

	return `${s3Base}/${version}/`;
}

import { dataStoreRelativePath, getDataStoreCollection, loadDataStore } from '../shared/data-store';
import { fileExists, findWorkspaceRoot, safelyCreateDirectory } from '../shared/utils';
import { parseRegionData, resolveBoundingBox } from './content';
import { fetchDivisionData, initializeDuckDB } from './duckdb';
import { saveFlatgeobuf } from './flatgeobuf';
import { convertToFeatureCollection } from './geojson';
import { saveSvg } from './svg';

const rootPath = findWorkspaceRoot();

const { values } = parseArgs({
	args: process.argv.slice(2),
	options: {
		'output-path': {
			type: 'string',
			short: 'o',
			default: 'public/divisions',
		},
		'cache-path': {
			type: 'string',
			short: 'c',
			default: './.cache/divisions',
		},
	},
});

const cachePath = path.join(rootPath, values['cache-path']);
const outputPath = path.join(rootPath, values['output-path']);

interface RegionProcessingNeeds {
	region: RegionMetadata;
	needsFgb: boolean;
	needsSvg: boolean;
}

async function collectProcessingNeeds(regions: Array<RegionMetadata>) {
	const processingNeeds: Array<RegionProcessingNeeds> = [];

	for (const region of regions) {
		const fgbPath = path.join(outputPath, `${region.id}.fgb`);
		const svgPath = path.join(cachePath, `${region.id}.svg`);

		const needsFgb = !(await fileExists(fgbPath));
		const needsSvg = !(await fileExists(svgPath));

		if (needsFgb || needsSvg) {
			processingNeeds.push({ region, needsFgb, needsSvg });
		}
	}

	return processingNeeds;
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
			console.warn(
				chalk.yellow(`No selection bbox found for ${chalk.cyan(needs.region.id)} or its ancestors`),
			);
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

async function processRegion({
	needs,
	divisionsById,
	regionsById,
}: {
	needs: RegionProcessingNeeds;
	divisionsById: Map<string, DivisionItem>;
	regionsById: Map<string, RegionMetadata>;
}) {
	const { region, needsFgb, needsSvg } = needs;

	const divisionItems: Array<DivisionItem> = [];

	for (const divisionId of region.divisionIds) {
		const divisionItem = divisionsById.get(divisionId);

		if (!divisionItem) {
			console.warn(
				chalk.yellow(`No division data found for division ID: ${chalk.cyan(divisionId)}`),
			);
			continue;
		}

		divisionItems.push(divisionItem);
	}

	if (divisionItems.length === 0) return false;

	console.log(
		chalk.green(
			`Found ${chalk.cyan(String(divisionItems.length))}/${chalk.cyan(String(region.divisionIds.length))} division(s) for ${chalk.cyan(region.id)}`,
		),
	);

	const divisionFeatureCollection = convertToFeatureCollection(divisionItems);

	if (needsFgb) {
		await saveFlatgeobuf(divisionFeatureCollection, region.id, outputPath);
	} else {
		console.log(chalk.gray(`  Skipping FGB (already exists): ${chalk.cyan(region.id)}`));
	}

	if (needsSvg) {
		const divisionClippingBBox = resolveBoundingBox(region, regionsById, 'divisionClippingBBox');

		await saveSvg({
			geojsonData: divisionFeatureCollection as DivisionFeatureCollection,
			id: region.id,
			outputDir: cachePath,
			options: divisionClippingBBox ? { divisionClippingBBox } : {},
		});
	} else {
		console.log(chalk.gray(`  Skipping SVG (already exists): ${chalk.cyan(region.id)}`));
	}

	console.log(chalk.green(`✓ Successfully processed ${chalk.cyan(region.id)}`));

	return true;
}

async function processBBoxGroup({
	db,
	bboxNeeds,
	selectionBBox,
	regionsById,
	overtureUrl,
}: {
	db: DuckDBConnection;
	bboxNeeds: Array<RegionProcessingNeeds>;
	selectionBBox: GeometryBoundingBox;
	regionsById: Map<string, RegionMetadata>;
	overtureUrl: string;
}) {
	const divisionIds = new Set(bboxNeeds.flatMap(({ region }) => region.divisionIds));

	const divisionsById = await fetchDivisionData({
		db,
		divisionIds,
		selectionBBox,
		cachePath,
		overtureUrl,
	});

	let successCount = 0;

	for (const needs of bboxNeeds) {
		console.log(chalk.blue(`\nProcessing ${chalk.cyan(needs.region.id)}...`));

		// One bad region should not abort the run
		try {
			if (await processRegion({ needs, divisionsById, regionsById })) {
				successCount++;
			}
		} catch (error) {
			console.error(chalk.red(`✗ Failed to process ${chalk.cyan(needs.region.id)}:`), error);
		}
	}

	return successCount;
}

async function processRegions(
	db: DuckDBConnection,
	regions: Array<RegionMetadata>,
	regionsById: Map<string, RegionMetadata>,
	overtureUrl: string,
) {
	console.log(chalk.magenta(`\n=== Processing ${chalk.cyan(String(regions.length))} regions ===`));

	safelyCreateDirectory(outputPath);

	const processingNeeds = await collectProcessingNeeds(regions);

	if (processingNeeds.length === 0) {
		console.log(chalk.green('All files already exist, skipping query'));

		return regions.length;
	}

	console.log(
		chalk.blue(
			`Processing ${chalk.cyan(String(processingNeeds.length))}/${chalk.cyan(String(regions.length))} regions`,
		),
	);

	const needsBySelectionBBox = groupNeedsBySelectionBBox(processingNeeds, regionsById);

	console.log(
		chalk.blue(`Processing ${chalk.cyan(String(needsBySelectionBBox.size))} bbox groups...`),
	);

	let successCount = regions.length - processingNeeds.length;

	for (const [bboxKey, bboxNeeds] of needsBySelectionBBox) {
		const selectionBBox = JSON.parse(bboxKey) as GeometryBoundingBox;

		console.log(
			chalk.magenta(
				`\n--- Processing bbox group (${chalk.cyan(String(bboxNeeds.length))} regions) ---`,
			),
		);

		successCount += await processBBoxGroup({
			db,
			bboxNeeds,
			selectionBBox,
			regionsById,
			overtureUrl,
		});
	}

	return successCount;
}

async function mapDivisions() {
	const overtureUrl = await resolveLatestRelease();

	console.log(
		chalk.blue(`Fetching administrative divisions from Overture Maps: ${chalk.cyan(overtureUrl)}`),
	);

	try {
		// Load region data from data-store
		const { collections } = loadDataStore(path.join(rootPath, dataStoreRelativePath));
		const regionEntries = getDataStoreCollection(collections, ['regions']);

		const { allRegions, regionsWithDivisionIds } = parseRegionData(regionEntries);

		if (regionsWithDivisionIds.length === 0) {
			console.log(chalk.yellow('No regions with division IDs found.'));
			return;
		}

		// Build lookup map from ALL regions (including those without divisionIds)
		// This enables hierarchical bbox resolution from parent regions
		const regionsById = new Map(allRegions.map((region) => [region.id, region]));

		// Initialize DuckDB connection
		const connection = await initializeDuckDB();

		const totalCount = regionsWithDivisionIds.length;

		// Process only regions with division IDs
		const successCount = await processRegions(
			connection,
			regionsWithDivisionIds,
			regionsById,
			overtureUrl,
		);

		connection.disconnectSync();

		console.log(chalk.magenta(`\n=== Summary ===`));
		console.log(
			chalk.green(
				`Successfully processed: ${chalk.cyan(String(successCount))} / ${chalk.cyan(String(totalCount))} regions`,
			),
		);
		console.log(chalk.blue(`Output directory: ${chalk.cyan(values['output-path'])}`));

		if (successCount === totalCount) {
			console.log(chalk.green('🎉 All regions processed successfully!'));
		} else {
			console.log(chalk.yellow('⚠️  Some regions failed to process. Check the logs above.'));
			process.exit(1);
		}
	} catch (error) {
		console.error(chalk.red('❌ Script failed:'), error);
		process.exit(1);
	}
}

// Run the script
await mapDivisions();
