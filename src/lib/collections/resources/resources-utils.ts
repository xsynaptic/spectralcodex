import type { CollectionEntry } from 'astro:content';

import * as R from 'remeda';

import { getLocationsCollection } from '#lib/collections/locations/locations-data.ts';
import { getPostsCollection } from '#lib/collections/posts/posts-data.ts';
import { createFirstRegionByReferenceFunction } from '#lib/collections/regions/regions-utils.ts';
import { getResourcesCollection, matchLinkUrl } from '#lib/collections/resources/resources-data.ts';
import { LanguageCodeEnum } from '#lib/i18n/i18n-types.ts';
import { getMapData } from '#lib/map/map-data.ts';
import { getLocationsFeatureCollection } from '#lib/map/map-locations.ts';
import {
	createContentMetadataFunction,
	filterHasFeaturedImage,
	sortContentMetadataByDate,
} from '#lib/metadata/metadata-utils.ts';
import {
	createFilterEntryQualityFunction,
	filterWithContent,
	sortByContentCount,
} from '#lib/utils/collections.ts';

/**
 * Get locations associated with a resource (via links URL match or sources ID match)
 */
export async function createLocationsByResourceFunction() {
	const { entries } = await getLocationsCollection();

	return function getLocationsByResource(
		resource: CollectionEntry<'resources'>,
	): Array<CollectionEntry<'locations'>> {
		const resourceId = resource.id;
		const matchPattern = resource.data.match;

		return entries.filter((location) => {
			// Check URL match via links field (for website-type resources with match field)
			const hasLinkMatch =
				matchPattern &&
				location.data.links?.some((link) =>
					typeof link === 'string'
						? matchLinkUrl(link, matchPattern)
						: matchLinkUrl(link.url, matchPattern),
				);

			// Check ID match via sources field (for publication-type resources)
			const hasSourceMatch = location.data.sources?.some((source) =>
				typeof source === 'string' ? source === resourceId : false,
			);

			return hasLinkMatch || hasSourceMatch;
		});
	};
}

/**
 * Get posts associated with a resource (via links URL match or sources ID match)
 */
async function createPostsByResourceFunction() {
	const { entries } = await getPostsCollection();

	return function getPostsByResource(
		resource: CollectionEntry<'resources'>,
	): Array<CollectionEntry<'posts'>> {
		const resourceId = resource.id;
		const matchPattern = resource.data.match;

		return entries.filter((entry) => {
			// Check URL match via links field (for website-type resources with match field)
			const hasLinkMatch =
				matchPattern &&
				entry.data.links?.some((link) =>
					typeof link === 'string'
						? matchLinkUrl(link, matchPattern)
						: matchLinkUrl(link.url, matchPattern),
				);

			// Check ID match via sources field (for publication-type resources)
			const hasSourceMatch = entry.data.sources?.some((source) =>
				typeof source === 'string' ? source === resourceId : false,
			);

			return hasLinkMatch || hasSourceMatch;
		});
	};
}

/**
 * Resolve links and sources
 */
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

/**
 * Data for a single resource entry page: metadata items and map data
 */
export async function createQueryResourcesEntryFunction() {
	const getLocationsByResource = await createLocationsByResourceFunction();
	const getPostsByResource = await createPostsByResourceFunction();
	const getContentMetadata = await createContentMetadataFunction();
	const getFirstRegionByReference = await createFirstRegionByReferenceFunction();

	return function queryResourcesEntry(entry: CollectionEntry<'resources'>) {
		const regionPrimary = getFirstRegionByReference(entry.data.regions);

		// Get locations associated with this link
		const locationsFiltered = getLocationsByResource(entry);

		// Get posts associated with this link
		const postsFiltered = getPostsByResource(entry);

		// Metadata items are the posts and locations that are associated with the link
		const metadataItems = R.pipe(
			[
				...R.pipe(
					locationsFiltered,
					R.filter(createFilterEntryQualityFunction(2)),
					getContentMetadata,
				),
				...R.pipe(postsFiltered, getContentMetadata),
			],
			R.filter(filterHasFeaturedImage),
			R.sort(sortContentMetadataByDate),
		);

		const mapData = getMapData({
			mapId: `${entry.collection}/${entry.id}`,
			featureCollection: getLocationsFeatureCollection(locationsFiltered),
			...(regionPrimary?.data._langCode?.startsWith('zh')
				? { languages: [LanguageCodeEnum.English, LanguageCodeEnum.ChineseTraditional] }
				: {}),
		});

		return { metadataItems, mapData };
	};
}

export async function queryResourcesIndex() {
	const { entries } = await getResourcesCollection();

	return R.pipe(
		entries,
		R.filter((entry) => !!entry.data.showPage),
		R.filter(filterWithContent),
		R.sort(sortByContentCount),
	);
}
