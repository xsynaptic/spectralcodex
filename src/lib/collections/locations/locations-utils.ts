import type { CollectionEntry } from 'astro:content';

import * as R from 'remeda';

import type { LocationsNearbyItem } from '#lib/collections/locations/locations-schemas.ts';
import type { Thing } from '#lib/utils/seo-structured-data.ts';

import { getCatalog } from '#lib/catalog/catalog-data.ts';
import { isEditorialEntry, sortCatalogByDate } from '#lib/catalog/catalog-utils.ts';
import {
	createLocationsByIdsFunction,
	getLocationsCollection,
} from '#lib/collections/locations/locations-data.ts';
import { createPostsByIdsFunction } from '#lib/collections/posts/posts-data.ts';
import { createFirstRegionByReferenceFunction } from '#lib/collections/regions/regions-data.ts';
import { createRegionAncestorsFunction } from '#lib/collections/regions/regions-utils.ts';
import { LanguageCodeEnum } from '#lib/i18n/i18n-types.ts';
import { getMapLanguages, getMultilingualContent } from '#lib/i18n/i18n-utils.ts';
import { createMapDataFunction } from '#lib/map/map-data.ts';
import { getLocationsMapRule } from '#lib/map/map-locations.ts';
import { contentPolicy } from '#lib/utils/content-policy.ts';
import { getDescriptionRenderedText } from '#lib/utils/description-data.ts';
import { getContentPath } from '#lib/utils/routing.ts';
import { buildEntryBreadcrumbSchema, buildPlaceSchema } from '#lib/utils/seo-structured-data.ts';

export async function getLocationSchemas(
	entry: CollectionEntry<'locations'>,
	props: { url: string },
): Promise<Array<Thing>> {
	if (entry.data.override || (entry.data.hideLocation && contentPolicy.hideSensitiveLocations)) {
		return [];
	}

	const getFirstRegionByReference = await createFirstRegionByReferenceFunction();
	const getRegionAncestors = await createRegionAncestorsFunction();

	const regionPrimary = getFirstRegionByReference(entry.data.regions);
	const regionAncestors = regionPrimary ? getRegionAncestors(regionPrimary).toReversed() : [];

	return [
		buildEntryBreadcrumbSchema({
			collection: 'locations',
			regions: regionAncestors,
			title: entry.data.title,
			url: props.url,
		}),
		buildPlaceSchema({
			coordinates: getFirstCoordinates(entry),
			description: getDescriptionRenderedText(entry),
			title: entry.data.title,
			url: props.url,
		}),
	];
}

function getFirstCoordinates(entry: CollectionEntry<'locations'>): [number, number] | undefined {
	const geometry = entry.data.geometry;
	const point = Array.isArray(geometry) ? geometry[0] : geometry;

	if (!point) return undefined;

	return [point.coordinates[0], point.coordinates[1]];
}

const locationNearbyRadiusKmMin = 1;
const locationNearbyRadiusKmMax = 3;
const locationNearbyRadiusNeighborCount = 5;

export async function createLocationEntryDisplayFunction() {
	const getFirstRegionByReference = await createFirstRegionByReferenceFunction();

	return function getLocationEntryDisplay(entry: CollectionEntry<'locations'>) {
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
	const getLocationsByIds = await createLocationsByIdsFunction();
	const getFirstRegionByReference = await createFirstRegionByReferenceFunction();
	const catalog = await getCatalog();
	const getMapData = await createMapDataFunction();

	return function queryLocationsEntry(entry: CollectionEntry<'locations'>) {
		const regionPrimary = getFirstRegionByReference(entry.data.regions);

		const nearbyIds = entry.data._nearby?.map(({ locationId }) => locationId) ?? [];

		const mapData = getMapData({
			boundsBuffer: getLocationNearbyRadius(entry.data._nearby),
			mapId: `${entry.collection}/${entry.id}`,
			rule: getLocationsMapRule(getLocationsByIds([entry.id, ...nearbyIds])),
			targetId: entry.data._uuid ?? entry.id,
			...getMapLanguages(regionPrimary?.data._langCode),
		});

		const catalogItems = R.pipe(
			entry.data._posts ?? [],
			getPostsByIds,
			catalog.resolve,
			R.sort(sortCatalogByDate),
		);

		const backlinks = catalog.backlinksOf(entry.id).filter(isEditorialEntry);

		return { backlinks, catalogItems, mapData };
	};
}

export async function getLocationsNearbyList(entry: CollectionEntry<'locations'>, limit: number) {
	const { entriesMap } = await getLocationsCollection();

	return (entry.data._nearby?.slice(0, limit) ?? []).flatMap(({ distanceDisplay, locationId }) => {
		const location = entriesMap.get(locationId);

		if (!location) return [];

		return [
			{
				distanceDisplay,
				title: location.data.title,
				titleMultilingual: getMultilingualContent({ data: location.data, prop: 'title' })?.primary,
				url: getContentPath('locations', location.id),
			},
		];
	});
}

export async function queryLocationsIndex() {
	const { entries } = await getLocationsCollection();

	const catalog = await getCatalog();

	return R.pipe(
		entries,
		R.filter((item) => !item.data.hideIndex),
		R.filter((entry) => entry.data.entryQuality >= 2),
		R.filter((item) => !!item.data.imageFeatured),
		catalog.resolve,
		R.sort(sortCatalogByDate),
	);
}

// Some entries in Taiwan also have Japanese titles; we'd like to display this as well
function getLangCodeAdditional(regionPrimary: CollectionEntry<'regions'> | undefined) {
	const isTaiwan =
		regionPrimary?.id === 'taiwan' || regionPrimary?.data._ancestors?.includes('taiwan');

	return isTaiwan ? { langCodeAdditional: LanguageCodeEnum.Japanese } : {};
}

// Dense areas keep the minimum radius, remote ones widen toward the maximum
function getLocationNearbyRadius(nearby: Array<LocationsNearbyItem> | undefined): number {
	if (!nearby || nearby.length === 0) return locationNearbyRadiusKmMin;

	const index = Math.min(locationNearbyRadiusNeighborCount, nearby.length) - 1;
	const neighborDistance = nearby[index]?.distance ?? locationNearbyRadiusKmMin;

	return Math.min(Math.max(neighborDistance, locationNearbyRadiusKmMin), locationNearbyRadiusKmMax);
}
