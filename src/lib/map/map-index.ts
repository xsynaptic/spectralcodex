import type { MapPopupItemInput, MapSourceItemInput } from '@spectralcodex/react-map-component';
import type { CollectionEntry } from 'astro:content';
import type { Position } from 'geojson';

import { MapDataKeysCompressed } from '@spectralcodex/shared/map';
import pMemoize from 'p-memoize';
import * as R from 'remeda';

import { getLocationsCollection } from '#lib/collections/locations/locations-data.ts';
import {
	getRegionsCollection,
	resolveLocationRegions,
} from '#lib/collections/regions/regions-data.ts';
import { getThemesCollection } from '#lib/collections/themes/themes-data.ts';
import { assignChunks } from '#lib/map/map-chunks.ts';
import {
	getLocationFeatureIds,
	getLocationsFeatureCollection,
	getLocationsMapPopupData,
	getLocationsMapSourceData,
} from '#lib/map/map-locations.ts';
import { computeRegionOrdinals } from '#lib/map/map-region-ordinals.ts';

interface MapIndexData {
	// One row per non-hidden feature: source shape plus region ordinals, theme indices, chunk key
	index: Array<MapSourceItemInput>;
	// Popup entries grouped by chunk key, each array sorted by id
	chunks: Map<string, Array<MapPopupItemInput>>;
	// Every feature id → its popup chunk key; small inline maps stamp this onto their points
	chunkKeyById: Map<string, string>;
}

// Memoized region nested-set numbering; region maps read their own interval to build a scope
export const getMapRegionOrdinals = pMemoize(async () => {
	const { entries: regions } = await getRegionsCollection();

	return computeRegionOrdinals(
		regions.map((entry) => ({ id: entry.id, parent: entry.data.parent })),
	);
});

// Memoized theme → index map; theme maps read their own index to build a scope
export const getMapThemeIndexById = pMemoize(async () => {
	const { entries: themes } = await getThemesCollection();
	const themeIndexById = new Map<string, number>();
	const sortedThemeIds = themes.map((entry) => entry.id).sort((a, b) => a.localeCompare(b));

	for (const [index, id] of sortedThemeIds.entries()) {
		themeIndexById.set(id, index);
	}
	return themeIndexById;
});

// Drill into a coordinate position to the first [lng, lat] pair
function getFirstLngLat(coordinates: unknown): [number, number] {
	let current: unknown = coordinates;
	while (Array.isArray(current) && Array.isArray(current[0])) {
		current = current[0];
	}
	if (Array.isArray(current) && typeof current[0] === 'number' && typeof current[1] === 'number') {
		return [current[0], current[1]];
	}
	return [0, 0];
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

// Unique, ascending membership indices for a set of content references
function getMembershipIndices(
	references: ReadonlyArray<{ id: string }>,
	indexById: Map<string, number>,
): Array<number> {
	return R.pipe(
		references,
		R.map((reference) => indexById.get(reference.id)),
		R.filter(R.isNonNullish),
		R.unique(),
		R.sortBy(R.identity()),
	);
}

// Memoized so a single build computes the shared artifacts once
export const getMapIndexData = pMemoize(async (): Promise<MapIndexData> => {
	const { entries: locations } = await getLocationsCollection();
	const { ordinalById } = await getMapRegionOrdinals();
	const themeIndexById = await getMapThemeIndexById();

	const featureCollection = getLocationsFeatureCollection(locations);
	const sourceData = getLocationsMapSourceData(featureCollection) ?? [];
	const popupData = getLocationsMapPopupData(featureCollection) ?? [];

	const locationByFeatureId = buildLocationByFeatureId(locations);

	const coordinatesById = new Map<string, Position>();
	const popupById = new Map<string, MapPopupItemInput>();

	if (featureCollection) {
		for (const feature of featureCollection.features) {
			if (typeof feature.id === 'string') {
				coordinatesById.set(feature.id, feature.geometry.coordinates as Position);
			}
		}
	}
	for (const popupItem of popupData) {
		popupById.set(popupItem[MapDataKeysCompressed.Id], popupItem);
	}

	// Assign chunk keys by binning every feature, weighted by its serialized popup size
	const chunkInputs = sourceData.map((sourceItem) => {
		const id = sourceItem[MapDataKeysCompressed.Id];
		const [lng, lat] = getFirstLngLat(coordinatesById.get(id));
		const popupItem = popupById.get(id);
		const popupBytes = popupItem ? Buffer.byteLength(JSON.stringify(popupItem)) : 0;

		return { id, lng, lat, popupBytes };
	});

	const { chunkKeyById, chunkIds } = assignChunks(chunkInputs);

	// Attach membership columns; omit empty arrays to save bytes
	const index = sourceData.map((sourceItem) => {
		const id = sourceItem[MapDataKeysCompressed.Id];
		const location = locationByFeatureId.get(id);

		const regionOrdinals = location
			? getMembershipIndices(resolveLocationRegions(location), ordinalById)
			: [];
		const themeIndices = location
			? getMembershipIndices(location.data.themes ?? [], themeIndexById)
			: [];

		return {
			...sourceItem,
			...(regionOrdinals.length > 0
				? { [MapDataKeysCompressed.RegionOrdinals]: regionOrdinals }
				: {}),
			...(themeIndices.length > 0 ? { [MapDataKeysCompressed.ThemeIndices]: themeIndices } : {}),
			[MapDataKeysCompressed.ChunkKey]: chunkKeyById.get(id) ?? '0-0-0',
		} satisfies MapSourceItemInput;
	});

	const chunks = new Map<string, Array<MapPopupItemInput>>();
	for (const [chunkKey, ids] of chunkIds) {
		chunks.set(
			chunkKey,
			ids
				.map((id) => popupById.get(id))
				.filter((popupItem): popupItem is MapPopupItemInput => popupItem !== undefined),
		);
	}

	return { index, chunks, chunkKeyById };
});
