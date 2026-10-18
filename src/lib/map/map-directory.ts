import type {
	MapFeaturesRule,
	MapPayloadBase,
	MapScope,
	MapSourceItem,
} from '@spectralcodex/map-codec';
import type { CollectionEntry } from 'astro:content';

import {
	encodeMapPopupData,
	encodeMapSourceData,
	getMapPayloadUrl,
	MapDivisionMaskSchema,
	mapPayloadName,
	mapPopupKeys,
	selectMapRows,
} from '@spectralcodex/map-codec';
import { CUSTOM_CACHE_PATH } from 'astro:env/server';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import pMemoize from 'p-memoize';
import * as R from 'remeda';

import { atlasRegionId } from '#constants.ts';
import { getLocationsCollection } from '#lib/collections/locations/locations-data.ts';
import { getObjectiveLocations } from '#lib/collections/locations/locations-subsets.ts';
import { getRegionsCollection } from '#lib/collections/regions/regions-data.ts';
import { resolveLocationRegions } from '#lib/collections/regions/regions-factory.ts';
import { assignChunks } from '#lib/map/map-chunks.ts';
import { hashMapPayloads } from '#lib/map/map-directory-hash.ts';
import { getMapThemeIndexById } from '#lib/map/map-entry-rules.ts';
import {
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
	isPrivate?: boolean | undefined;
	ordinalById: ReadonlyMap<string, number>;
	prefix: string;
	themeIndexById: ReadonlyMap<string, number>;
}

interface MapDirectoryData {
	atlasRows: Array<MapSourceItem>;
	atlasRule: MapFeaturesRule;
	datasets: Record<MapDatasetName, MapDataset>;
	divisionUrlById: Map<string, string>;
	mapScopeByKey: Map<string, MapScope>;
	payloads: Map<string, string>;
}

// No hidden-location filtering needed: only ids present in the (already filtered) source data are looked up
function buildLocationByFeatureId(
	locations: Array<CollectionEntry<'locations'>>,
): Map<string, CollectionEntry<'locations'>> {
	const locationByFeatureId = new Map<string, CollectionEntry<'locations'>>();

	for (const entry of locations) {
		for (const featureId of getLocationFeatureIds(entry)) {
			locationByFeatureId.set(featureId, entry);
		}
	}

	return locationByFeatureId;
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

function buildMapDataset(
	locations: Array<CollectionEntry<'locations'>>,
	{ isPrivate, ordinalById, prefix, themeIndexById }: MapDatasetContext,
) {
	const features = getLocationFeatures(locations, { includeHidden: isPrivate });
	const sourceData = getLocationsMapSourceData(features);
	const popupData = getLocationsMapPopupData(features);

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

		const regionOrdinals = location
			? getMembershipIndices(resolveLocationRegions(location), ordinalById)
			: [];
		const themeIndices = location
			? getMembershipIndices(location.data.themes ?? [], themeIndexById)
			: [];

		return {
			...sourceItem,
			properties: {
				...(isPrivate ? sourceItem.properties : R.omit(sourceItem.properties, ['objective'])),
				...(regionOrdinals.length > 0 ? { regionOrdinals } : {}),
				...(themeIndices.length > 0 ? { themeIndices } : {}),
				chunkKey: chunkKeyById.get(id) ?? '0',
			},
		} satisfies MapSourceItem;
	});

	const payloads = new Map([
		[getDirectoryPayloadId(prefix), JSON.stringify(encodeMapSourceData(directory))],
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

async function readDivisionMasks(regions: Array<CollectionEntry<'regions'>>) {
	const divisionsPath = path.join(process.cwd(), CUSTOM_CACHE_PATH, 'divisions');
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
	const { entries: regions, regionsTree } = await getRegionsCollection();
	const themeIndexById = await getMapThemeIndexById();
	const objectiveLocations = await getObjectiveLocations();

	const context = { ordinalById: regionsTree.ordinalById, themeIndexById };

	const objectives = buildMapDataset(objectiveLocations, {
		...context,
		isPrivate: true,
		prefix: 'objectives/',
	});
	const shared = buildMapDataset(locations, { ...context, prefix: '' });
	const atlasRule = getRegionMapRule(regionsTree.intervalById, atlasRegionId);
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

	return { atlasRows, atlasRule, datasets, divisionUrlById, mapScopeByKey, payloads };
});
