import type { CollectionEntry } from 'astro:content';

import * as R from 'remeda';

import { getCatalog } from '#lib/catalog/catalog-data.ts';
import { filterHasFeaturedImage, sortCatalogByDate } from '#lib/catalog/catalog-utils.ts';
import { getLocationsCollection } from '#lib/collections/locations/locations-data.ts';
import { getPostsCollection } from '#lib/collections/posts/posts-data.ts';
import { createFirstRegionByReferenceFunction } from '#lib/collections/regions/regions-utils.ts';
import { matchLinkUrl } from '#lib/collections/resources/resources-association.ts';
import {
	getResourceAssociation,
	getResourcesCollection,
} from '#lib/collections/resources/resources-data.ts';
import { getMapLanguages } from '#lib/i18n/i18n-utils.ts';
import { getMapData } from '#lib/map/map-data.ts';
import { getMapDirectoryData } from '#lib/map/map-directory.ts';
import { getLocationsFeatureCollection } from '#lib/map/map-locations.ts';
import { filterHasEntries, sortByEntryCount } from '#lib/utils/collections.ts';

// Matched via links URL or sources ID
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

// Matched via links URL or sources ID
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

export async function createResolveResourceLinksFunction() {
	const { entries } = await getResourcesCollection();

	return function resolveResourceLinks(
		entry: CollectionEntry<'locations' | 'posts' | 'regions' | 'resources' | 'themes'>,
	) {
		const entryLinks =
			'links' in entry.data && entry.data.links && entry.data.links.length > 0
				? entry.data.links
				: undefined;

		return entryLinks
			?.map((entryLink) => {
				if (typeof entryLink === 'string') {
					const resource = entries.find((entry) => matchLinkUrl(entryLink, entry.data.match));

					return resource ? { id: resource.id, ...resource.data, url: entryLink } : undefined;
				}

				return entryLink;
			})
			.filter((link) => !!link);
	};
}

type ResolveResourceLinks = Awaited<ReturnType<typeof createResolveResourceLinksFunction>>;

// Either a Resource entry flattened onto its id, or a link written inline in frontmatter
export type ResourceLink = NonNullable<ReturnType<ResolveResourceLinks>>[number];

export async function createResolveResourceSourcesFunction() {
	const { entriesMap } = await getResourcesCollection();

	return function resolveResourceSources(
		entry: CollectionEntry<'locations' | 'posts' | 'regions' | 'resources' | 'themes'>,
	) {
		const entrySources =
			'sources' in entry.data && entry.data.sources && entry.data.sources.length > 0
				? entry.data.sources
				: undefined;

		return entrySources
			?.map((entrySource) => {
				if (typeof entrySource === 'string') {
					const resource = entriesMap.get(entrySource);

					return resource ? { id: resource.id, ...resource.data } : undefined;
				}

				return entrySource;
			})
			.filter((source) => !!source);
	};
}

type ResolveResourceSources = Awaited<ReturnType<typeof createResolveResourceSourcesFunction>>;

// A cited work, either a Resource entry flattened onto its ID or one written inline in frontmatter
export type ResourceSource = NonNullable<ReturnType<ResolveResourceSources>>[number];

export async function createQueryResourcesEntryFunction() {
	const getLocationsByResource = await createLocationsByResourceFunction();
	const getPostsByResource = await createPostsByResourceFunction();
	const catalog = await getCatalog();
	const getFirstRegionByReference = await createFirstRegionByReferenceFunction();
	const { chunkKeyById, version } = await getMapDirectoryData();

	return function queryResourcesEntry(entry: CollectionEntry<'resources'>) {
		const regionPrimary = getFirstRegionByReference(entry.data.regions);

		const locationsFiltered = getLocationsByResource(entry);

		const postsFiltered = getPostsByResource(entry);

		const catalogItems = R.pipe(
			[
				...R.pipe(
					locationsFiltered,
					R.filter((location) => location.data.entryQuality >= 2),
					catalog.resolve,
				),
				...R.pipe(postsFiltered, catalog.resolve),
			],
			R.filter(filterHasFeaturedImage),
			R.sort(sortCatalogByDate),
		);

		const mapData = getMapData({
			mapId: `${entry.collection}/${entry.id}`,
			featureCollection: getLocationsFeatureCollection(locationsFiltered),
			locationCount: locationsFiltered.length,
			chunkKeyById,
			version,
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
		R.filter(filterHasEntries),
		R.sort(sortByEntryCount),
	);
}
