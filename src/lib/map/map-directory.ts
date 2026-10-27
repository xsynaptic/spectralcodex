import type {
	MapFeaturesRule,
	MapPayloadBase,
	MapScope,
	MapSourceItem,
} from '@spectralcodex/map-codec';

import {
	getMapPayloadUrl,
	getMapRowUrl,
	mapPayloadName,
	mapPopupKeys,
	selectMapRows,
} from '@spectralcodex/map-codec';
import {
	encodeMapDirectory,
	encodeMapPopupData,
	MapDivisionMaskSchema,
} from '@spectralcodex/map-codec/schemas';
import { getCachePaths } from '@spectralcodex/shared/paths';
import { CUSTOM_CACHE_PATH } from 'astro:env/server';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import pMemoize from 'p-memoize';
import * as R from 'remeda';

import type { Catalog } from '#lib/catalog/catalog-factory.ts';
import type { ComputedEntry } from '#lib/collections/collections-types.ts';
import type { MapBbox } from '#lib/map/map-bounds.ts';

import { atlasRegionId, mapBacklinkDistanceLimitKm } from '#constants.ts';
import { getCatalog } from '#lib/catalog/catalog-data.ts';
import { getLocationsCollection } from '#lib/collections/locations/locations-data.ts';
import { getObjectiveLocations } from '#lib/collections/locations/locations-subsets.ts';
import { getRegionsCollection, getRegionsTree } from '#lib/collections/regions/regions-data.ts';
import { getMapBacklinksByRowId } from '#lib/map/map-backlinks.ts';
import { getBoundsWithoutOutliers, getNaturalBounds } from '#lib/map/map-bounds.ts';
import { assignChunks } from '#lib/map/map-chunks.ts';
import { hashMapPayloads } from '#lib/map/map-directory-hash.ts';
import { getMapThemeIndexById } from '#lib/map/map-entry-rules.ts';
import {
	getGlobalMapRule,
	getLocationFeatureIds,
	getLocationFeatures,
	getLocationsMapPopupData,
	getLocationsMapSourceData,
	getRegionMapRule,
} from '#lib/map/map-locations.ts';
import { buildMapScopes, getMapScopeKey } from '#lib/map/map-scopes.ts';
import { getBasePath } from '#lib/utils/routing.ts';

export type MapDatasetName = 'objectives' | 'shared';

interface MapDataset {
	directory: Array<MapSourceItem>;
	payloadBase: MapPayloadBase;
	payloads: Map<string, string>;
}

interface MapDatasetContext {
	backlinksOf: Catalog['backlinksOf'];
	isPrivate?: boolean | undefined;
	ordinalById: ReadonlyMap<string, number>;
	prefix: string;
	themeIndexById: ReadonlyMap<string, number>;
}

interface MapDirectoryData {
	atlasRows: Array<MapSourceItem>;
	atlasRule: MapFeaturesRule;
	boundsByRootId: Map<string, MapBbox>;
	datasets: Record<MapDatasetName, MapDataset>;
	divisionUrlById: Map<string, string>;
	globalRule: MapFeaturesRule;
	mapScopeByKey: Map<string, MapScope>;
	payloads: Map<string, string>;
}

// No hidden-location filtering needed: only ids present in the (already filtered) source data are looked up
function buildLocationByFeatureId(
	locations: Array<ComputedEntry<'locations'>>,
): Map<string, ComputedEntry<'locations'>> {
	const locationByFeatureId = new Map<string, ComputedEntry<'locations'>>();

	for (const entry of locations) {
		for (const featureId of getLocationFeatureIds(entry)) {
			locationByFeatureId.set(featureId, entry);
		}
	}

	return locationByFeatureId;
}

function getFirstRowIdByEntryId(locations: Array<ComputedEntry<'locations'>>) {
	const firstRowIdByEntryId = new Map<string, string>();

	for (const entry of locations) {
		const [rowId] = getLocationFeatureIds(entry);

		if (rowId) firstRowIdByEntryId.set(entry.id, rowId);
	}

	return firstRowIdByEntryId;
}

function getMembershipIndices(
	references: ReadonlyArray<{ id: string }>,
	indexById: ReadonlyMap<string, number>,
): Array<number> {
	return R.pipe(
		references,
		R.map((reference) => indexById.get(reference.id)),
		R.filter(R.isNonNullish),
		R.unique(),
		R.sortBy(R.identity()),
	);
}

function assertDerivedUrl({ properties: { id, url } }: MapSourceItem) {
	const derivedUrl = getMapRowUrl(id);

	if (derivedUrl === url) return;

	throw new Error(
		`Location "${id}" routes to ${url ?? 'no url'} but the map directory derives ${derivedUrl}`,
	);
}

function buildMapDataset(
	locations: Array<ComputedEntry<'locations'>>,
	{ backlinksOf, isPrivate, ordinalById, prefix, themeIndexById }: MapDatasetContext,
) {
	const features = getLocationFeatures(locations, { includeHidden: isPrivate });
	const sourceData = getLocationsMapSourceData(features);
	const popupData = getLocationsMapPopupData(features);
	const backlinksByRowId = getMapBacklinksByRowId(sourceData, {
		backlinksOf,
		distanceLimit: mapBacklinkDistanceLimitKm,
		firstRowIdByEntryId: getFirstRowIdByEntryId(locations),
	});

	const locationByFeatureId = buildLocationByFeatureId(locations);
	const popupById = new Map(
		encodeMapPopupData(popupData).map((popupItem) => [popupItem[mapPopupKeys.id], popupItem]),
	);

	const chunkInputs = sourceData.map((sourceItem) => {
		const id = sourceItem.properties.id;
		const [lng, lat] = sourceItem.geometry.coordinates;
		const popupItem = popupById.get(id);
		const popupBytes = popupItem ? Buffer.byteLength(JSON.stringify(popupItem)) : 0;

		return { id, lat, lng, popupBytes };
	});

	const { chunkIds, chunkKeyById } = assignChunks(chunkInputs);

	const directory = sourceData.map((sourceItem) => {
		const id = sourceItem.properties.id;
		const location = locationByFeatureId.get(id);

		assertDerivedUrl(sourceItem);

		const regionOrdinals = location ? getMembershipIndices(location.data.regions, ordinalById) : [];
		const themeIndices = location
			? getMembershipIndices(location.data.themes ?? [], themeIndexById)
			: [];

		return {
			...sourceItem,
			properties: {
				...(isPrivate ? sourceItem.properties : R.omit(sourceItem.properties, ['objective'])),
				...(regionOrdinals.length > 0 ? { regionOrdinals } : {}),
				...(themeIndices.length > 0 ? { themeIndices } : {}),
				backlinks: backlinksByRowId.get(id),
				chunkKey: chunkKeyById.get(id) ?? '0',
			},
		} satisfies MapSourceItem;
	});

	const payloads = new Map([
		[getDirectoryPayloadId(prefix), JSON.stringify(encodeMapDirectory(directory))],
	]);

	for (const [chunkKey, ids] of chunkIds) {
		const popupItems = ids
			.map((id) => popupById.get(id))
			.filter((popupItem) => popupItem !== undefined);

		payloads.set(`${prefix}${chunkKey}`, JSON.stringify(popupItems));
	}

	return { directory, payloads, prefix };
}

async function readDivisionMask(regionId: string, divisionsPath: string) {
	const filePath = path.join(divisionsPath, `${regionId}.json`);

	try {
		return await readFile(filePath, 'utf8');
	} catch (error) {
		throw new Error(
			`Region "${regionId}" names a Division but ${filePath} is missing; run \`pnpm map-divisions\``,
			{ cause: error },
		);
	}
}

async function readDivisionMasks(regions: Array<ComputedEntry<'regions'>>) {
	const { divisionsPath } = getCachePaths(path.resolve(CUSTOM_CACHE_PATH));
	const shownRegions = regions.filter((entry) => entry.data.divisionId && !entry.data.hideDivision);

	const bodies = await Promise.all(
		shownRegions.map(async (entry) => {
			const body = await readDivisionMask(entry.id, divisionsPath);

			MapDivisionMaskSchema.parse(JSON.parse(body));

			return [entry.id, body] as const;
		}),
	);

	return new Map(bodies);
}

function getDirectoryPayloadId(prefix: string) {
	return `${prefix}${mapPayloadName.directory}`;
}

function getDivisionPayloadId(regionId: string) {
	return `divisions/${regionId}`;
}

function withVersion({
	directory,
	payloads,
	prefix,
}: Omit<MapDataset, 'payloadBase'> & { prefix: string }): MapDataset {
	const payloadBase = {
		path: getBasePath('api/map'),
		prefix,
		version: hashMapPayloads(payloads),
	};

	return { directory, payloadBase, payloads };
}

export const getMapDirectoryData = pMemoize(async (): Promise<MapDirectoryData> => {
	const { entries: locations } = await getLocationsCollection();
	const { entries: regions } = await getRegionsCollection();
	const regionsTree = await getRegionsTree();
	const themeIndexById = await getMapThemeIndexById();
	const objectiveLocations = await getObjectiveLocations();
	const catalog = await getCatalog();

	const context = {
		backlinksOf: catalog.backlinksOf,
		ordinalById: regionsTree.ordinalById,
		themeIndexById,
	};

	const objectives = buildMapDataset(objectiveLocations, {
		...context,
		isPrivate: true,
		prefix: 'objectives/',
	});
	const shared = buildMapDataset(locations, { ...context, prefix: '' });
	const atlasRule = getRegionMapRule(regionsTree.intervalById, atlasRegionId);
	const globalRule = getGlobalMapRule(regionsTree.intervalById, regionsTree.roots);
	const boundsByRootId = new Map(
		regionsTree.roots.flatMap((rootId) => {
			const rootRule = getRegionMapRule(regionsTree.intervalById, rootId);
			const rootRows = selectMapRows(shared.directory, rootRule);

			if (rootRows.length === 0) return [];

			const rootBounds = getBoundsWithoutOutliers(rootRows) ?? getNaturalBounds(rootRows);

			return [[rootId, rootBounds] as const];
		}),
	);
	const atlasRows = selectMapRows(shared.directory, atlasRule);
	const mapScopes = await buildMapScopes(atlasRows);
	const divisionMaskById = await readDivisionMasks(regions);

	shared.payloads.set(
		mapPayloadName.scopes,
		JSON.stringify(mapScopes.flatMap(({ row }) => (row ? [row] : []))),
	);

	const datasets = {
		objectives: withVersion(objectives),
		shared: withVersion(shared),
	};
	const divisionPayloads = new Map(
		[...divisionMaskById].map(([id, body]) => [getDivisionPayloadId(id), body]),
	);
	const divisionUrlById = new Map(
		[...divisionMaskById].map(([id, body]) => {
			const payloadId = getDivisionPayloadId(id);
			const version = hashMapPayloads(new Map([[payloadId, body]]));

			return [id, getMapPayloadUrl({ ...datasets.shared.payloadBase, version }, payloadId)];
		}),
	);
	const mapScopeByKey = new Map(
		mapScopes.map(({ entry, scope }) => {
			const apiDivisionUrl =
				entry.collection === 'regions' ? divisionUrlById.get(entry.id) : undefined;

			return [getMapScopeKey(entry), apiDivisionUrl ? { ...scope, apiDivisionUrl } : scope];
		}),
	);
	const payloads = new Map([
		...datasets.objectives.payloads,
		...datasets.shared.payloads,
		...divisionPayloads,
	]);

	return {
		atlasRows,
		atlasRule,
		boundsByRootId,
		datasets,
		divisionUrlById,
		globalRule,
		mapScopeByKey,
		payloads,
	};
});
