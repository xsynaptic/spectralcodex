import * as R from 'remeda';

import type { ComputedEntry } from '#lib/collections/collections-types.ts';
import type { LocationsNearbyItem } from '#lib/collections/locations/locations-nearby.ts';

import { getCatalog } from '#lib/catalog/catalog-data.ts';
import { isEditorialEntry, sortCatalogByDate } from '#lib/catalog/catalog-utils.ts';
import { getLocationsCollection } from '#lib/collections/locations/locations-data.ts';
import { createPostsByIdsFunction } from '#lib/collections/posts/posts-data.ts';
import { createFirstRegionByReferenceFunction } from '#lib/collections/regions/regions-data.ts';
import { LanguageCodeEnum } from '#lib/i18n/i18n-types.ts';
import { getMapLanguages, getMultilingualContent } from '#lib/i18n/i18n-utils.ts';
import { createMapDataFunction } from '#lib/map/map-data.ts';
import { getMapDirectoryData } from '#lib/map/map-directory.ts';
import { getLocationFeatureIds } from '#lib/map/map-locations.ts';
import { isListed, isListedQuality } from '#lib/utils/content-policy.ts';

const locationNearbyRadiusKmMin = 1;
const locationNearbyRadiusKmMax = 3;
const locationNearbyRadiusNeighborCount = 5;

export async function createLocationEntryDisplayFunction() {
	const getFirstRegionByReference = await createFirstRegionByReferenceFunction();

	return function getLocationEntryDisplay(entry: ComputedEntry<'locations'>) {
		const regionPrimary = getFirstRegionByReference(entry.data.regions);
		const regionLangCode = regionPrimary?.data._langCode;

		const titleResult = getMultilingualContent({
			data: entry.data,
			prop: 'title',
			...(regionLangCode ? { langCode: regionLangCode } : {}),
			...getLangCodeAdditional(regionPrimary),
		});

		const addressResult = getMultilingualContent({
			data: entry.data,
			prop: 'address',
			...(regionLangCode ? { langCode: regionLangCode } : {}),
		});

		return {
			addressBase: entry.data.address,
			addressMultilingual: addressResult?.primary,
			regionLangCode,
			regionPrimary,
			titleMultilingual: titleResult?.primary,
			titleMultilingualAdditional: titleResult?.additional ? [titleResult.additional] : undefined,
		};
	};
}

export async function createQueryLocationsEntryFunction() {
	const getPostsByIds = await createPostsByIdsFunction();
	const getFirstRegionByReference = await createFirstRegionByReferenceFunction();
	const catalog = await getCatalog();
	const getMapData = await createMapDataFunction();
	const { boundsByRootId, globalRule } = await getMapDirectoryData();

	return function queryLocationsEntry(entry: ComputedEntry<'locations'>) {
		const regionPrimary = getFirstRegionByReference(entry.data.regions);

		const mapData = getMapData({
			boundsBuffer: getLocationNearbyRadius(entry.data._nearby),
			limitBounds: regionPrimary
				? boundsByRootId.get(regionPrimary.data._ancestors.at(-1) ?? regionPrimary.id)
				: undefined,
			mapId: `${entry.collection}/${entry.id}`,
			rule: globalRule,
			targetIds: getLocationFeatureIds(entry),
			...getMapLanguages(regionPrimary?.data._langCode),
		});

		const catalogItems = R.pipe(
			entry.data._posts,
			getPostsByIds,
			catalog.resolve,
			R.sort(sortCatalogByDate),
		);

		const backlinks = catalog.backlinksOf(entry.id).filter(isEditorialEntry);

		return { backlinks, catalogItems, mapData };
	};
}

export async function getLocationsNearbyList(entry: ComputedEntry<'locations'>) {
	const { entriesMap } = await getLocationsCollection();

	return entry.data._nearby.flatMap(({ distanceDisplay, locationId }) => {
		const location = entriesMap.get(locationId);

		if (!location) return [];

		return [
			{
				distanceDisplay,
				status: location.data.status,
				title: location.data.title,
				titleMultilingual: getMultilingualContent({ data: location.data, prop: 'title' })?.primary,
				url: location.data._url,
			},
		];
	});
}

export async function queryLocationsIndex() {
	const { entries } = await getLocationsCollection();

	const catalog = await getCatalog();

	return R.pipe(
		entries,
		R.filter((entry) => isListed(entry.data)),
		R.filter((entry) => isListedQuality(entry.data)),
		R.filter((item) => !!item.data.imageFeatured),
		catalog.resolve,
		R.sort(sortCatalogByDate),
	);
}

// Some entries in Taiwan also have Japanese titles; we'd like to display this as well
function getLangCodeAdditional(regionPrimary: ComputedEntry<'regions'> | undefined) {
	const isTaiwan =
		regionPrimary?.id === 'taiwan' || regionPrimary?.data._ancestors.includes('taiwan');

	return isTaiwan ? { langCodeAdditional: LanguageCodeEnum.Japanese } : {};
}

// Dense areas keep the minimum radius, remote ones widen toward the maximum
function getLocationNearbyRadius(nearby: Array<LocationsNearbyItem>): number {
	if (nearby.length === 0) return locationNearbyRadiusKmMin;

	const index = Math.min(locationNearbyRadiusNeighborCount, nearby.length) - 1;
	const neighborDistance = nearby[index]?.distance ?? locationNearbyRadiusKmMin;

	return Math.min(Math.max(neighborDistance, locationNearbyRadiusKmMin), locationNearbyRadiusKmMax);
}
