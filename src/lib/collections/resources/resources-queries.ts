import type { CollectionEntry } from 'astro:content';

import * as R from 'remeda';

import { getCatalog } from '#lib/catalog/catalog-data.ts';
import { hasFeaturedImage, sortCatalogByDate } from '#lib/catalog/catalog-utils.ts';
import { getLocationsCollection } from '#lib/collections/locations/locations-data.ts';
import { getPostsCollection } from '#lib/collections/posts/posts-data.ts';
import { createFirstRegionByReferenceFunction } from '#lib/collections/regions/regions-data.ts';
import {
	getResourceAssociation,
	getResourcesCollection,
} from '#lib/collections/resources/resources-data.ts';
import { getMapLanguages } from '#lib/i18n/i18n-utils.ts';
import { createMapDataFunction } from '#lib/map/map-data.ts';
import { getLocationsMapRule } from '#lib/map/map-locations.ts';
import { hasEntries, sortByEntryCount } from '#lib/utils/collections.ts';
import { isListed, isListedQuality } from '#lib/utils/content-policy.ts';

export async function createQueryResourcesEntryFunction() {
	const getLocationsByResource = await createLocationsByResourceFunction();
	const getPostsByResource = await createPostsByResourceFunction();
	const catalog = await getCatalog();
	const getFirstRegionByReference = await createFirstRegionByReferenceFunction();
	const getMapData = await createMapDataFunction();

	return function queryResourcesEntry(entry: CollectionEntry<'resources'>) {
		const regionPrimary = getFirstRegionByReference(entry.data.regions);

		const locationsFiltered = getLocationsByResource(entry);

		const postsFiltered = getPostsByResource(entry);

		const catalogItems = R.pipe(
			[
				...R.pipe(
					locationsFiltered,
					R.filter((location) => isListed(location.data) && isListedQuality(location.data)),
					catalog.resolve,
				),
				...R.pipe(postsFiltered, catalog.resolve),
			],
			R.filter(hasFeaturedImage),
			R.sort(sortCatalogByDate),
		);

		const mapData = getMapData({
			mapId: `${entry.collection}/${entry.id}`,
			rule: getLocationsMapRule(locationsFiltered),
			...getMapLanguages(regionPrimary?.data._langCode),
		});

		return { catalogItems, mapData };
	};
}

export async function queryResourcesIndex() {
	const { entries } = await getResourcesCollection();

	return R.pipe(
		entries,
		R.filter((entry) => !!entry.data.showPage),
		R.filter(hasEntries),
		R.sort(sortByEntryCount),
	);
}

async function createLocationsByResourceFunction() {
	const { entriesMap } = await getLocationsCollection();
	const { locationIdsByResourceId } = await getResourceAssociation();

	return function getLocationsByResource(
		resource: CollectionEntry<'resources'>,
	): Array<CollectionEntry<'locations'>> {
		const locationIds = locationIdsByResourceId.get(resource.id) ?? [];

		return locationIds.map((locationId) => entriesMap.get(locationId)).filter((entry) => !!entry);
	};
}

async function createPostsByResourceFunction() {
	const { entriesMap } = await getPostsCollection();
	const { postIdsByResourceId } = await getResourceAssociation();

	return function getPostsByResource(
		resource: CollectionEntry<'resources'>,
	): Array<CollectionEntry<'posts'>> {
		const postIds = postIdsByResourceId.get(resource.id) ?? [];

		return postIds.map((postId) => entriesMap.get(postId)).filter((entry) => !!entry);
	};
}
