import type { CollectionEntry } from 'astro:content';

import * as R from 'remeda';

import type { Thing } from '#lib/utils/structured-data.ts';

import { getLocationsCollection } from '#lib/collections/locations/locations-data.ts';
import { createPostsByIdsFunction } from '#lib/collections/posts/posts-utils.ts';
import {
	createFirstRegionByReferenceFunction,
	createRegionAncestorsFunction,
} from '#lib/collections/regions/regions-utils.ts';
import { getTranslations } from '#lib/i18n/i18n-translations.ts';
import { LanguageCodeEnum } from '#lib/i18n/i18n-types.ts';
import { getMultilingualContent } from '#lib/i18n/i18n-utils.ts';
import { getMapData } from '#lib/map/map-data.ts';
import { getLocationsFeatureCollection } from '#lib/map/map-locations.ts';
import { createContentBacklinksFunction } from '#lib/metadata/metadata-backlinks.ts';
import {
	createContentMetadataFunction,
	sortContentMetadataByDate,
} from '#lib/metadata/metadata-utils.ts';
import { createFilterEntryQualityFunction } from '#lib/utils/collections.ts';
import { getContentUrl, getSiteUrl } from '#lib/utils/routing.ts';
import { buildBreadcrumbSchema, buildPlaceSchema } from '#lib/utils/structured-data.ts';
import { getDescription } from '#lib/utils/text.ts';

// Transform IDs into entries (and emit a warning when an ID doesn't match)
export async function createLocationsByIdsFunction() {
	const { entriesMap: locationsMap } = await getLocationsCollection();

	return function getLocationsById(ids: Array<string>): Array<CollectionEntry<'locations'>> {
		return ids
			.map((id) => {
				const entry = locationsMap.get(id);

				if (!entry && import.meta.env.DEV) {
					console.warn(`[Locations] Requested entry "${id}" not found!`);
				}
				return entry;
			})
			.filter((entry): entry is CollectionEntry<'locations'> => !!entry);
	};
}

// Get all locations referenced by a set of posts
export async function createLocationsByPostsFunction() {
	const { entriesMap: locationsMap } = await getLocationsCollection();

	return function getLocationsByPosts(
		...posts: Array<CollectionEntry<'posts'>>
	): Array<CollectionEntry<'locations'>> {
		const ids = [
			...new Set(posts.flatMap((post) => post.data.locations?.map((entry) => entry.id) ?? [])),
		];

		return ids
			.map((id) => locationsMap.get(id))
			.filter((entry): entry is CollectionEntry<'locations'> => !!entry);
	};
}

function getFirstCoordinates(entry: CollectionEntry<'locations'>): [number, number] | undefined {
	const geometry = entry.data.geometry;
	const point = Array.isArray(geometry) ? geometry[0] : geometry;

	if (!point) return undefined;

	return [point.coordinates[0], point.coordinates[1]];
}

export function sortLocationsByLatitude(
	a: CollectionEntry<'locations'>,
	b: CollectionEntry<'locations'>,
) {
	function getLatitudeCoordinate(entry: CollectionEntry<'locations'>): number {
		return Array.isArray(entry.data.geometry)
			? Math.max(...entry.data.geometry.map(({ coordinates }) => coordinates[1]))
			: entry.data.geometry.coordinates[1];
	}

	return getLatitudeCoordinate(b) - getLatitudeCoordinate(a);
}

export async function getLocationSchemas(
	entry: CollectionEntry<'locations'>,
	props: { url: string },
): Promise<Array<Thing>> {
	if (entry.data.override || (entry.data.hideLocation && !import.meta.env.DEV)) {
		return [];
	}

	const t = getTranslations();

	const getFirstRegionByReference = await createFirstRegionByReferenceFunction();
	const getRegionAncestors = await createRegionAncestorsFunction();

	const regionPrimary = getFirstRegionByReference(entry.data.regions);
	const regionAncestors = regionPrimary ? getRegionAncestors(regionPrimary).toReversed() : [];

	const breadcrumbItems = [
		{ name: t('site.title'), url: getSiteUrl() },
		{ name: t('collection.locations.labelPlural'), url: getSiteUrl('locations') },
		...regionAncestors.map((region) => ({
			name: region.data.title,
			url: getContentUrl('regions', region.id),
		})),
		{ name: entry.data.title },
	];

	return [
		buildBreadcrumbSchema(breadcrumbItems, props.url),
		buildPlaceSchema({
			title: entry.data.title,
			description: getDescription(entry),
			url: props.url,
			coordinates: getFirstCoordinates(entry),
		}),
	];
}

/**
 * Data for a single location entry page: map data, related posts, and backlinks
 */
export async function createQueryLocationsEntryFunction() {
	const getPostsByIds = await createPostsByIdsFunction();
	const getContentMetadata = await createContentMetadataFunction();
	const getFirstRegionByReference = await createFirstRegionByReferenceFunction();
	const getContentBacklinks = await createContentBacklinksFunction();

	return function queryLocationsEntry(entry: CollectionEntry<'locations'>) {
		const regionPrimary = getFirstRegionByReference(entry.data.regions);

		const mapData = getMapData({
			mapId: `${entry.collection}/${entry.id}`,
			featureCollection: getLocationsFeatureCollection([entry]),
			targetId: entry.data._uuid ?? entry.id,
			boundsBuffer: 1, // 1km fixed buffer
			...(regionPrimary?.data._langCode?.startsWith('zh')
				? { languages: [LanguageCodeEnum.English, LanguageCodeEnum.ChineseTraditional] }
				: {}),
		});

		const metadataItems = R.pipe(
			entry.data._posts ?? [],
			getPostsByIds,
			getContentMetadata,
			R.sort(sortContentMetadataByDate),
		);

		const backlinks = getContentBacklinks({ id: entry.id });

		return { mapData, metadataItems, backlinks };
	};
}

/**
 * Resolve region, lang code, and multilingual title data for a location entry
 */
export async function createLocationEntryDisplayFunction() {
	const getFirstRegionByReference = await createFirstRegionByReferenceFunction();

	return function getLocationEntryDisplay(entry: CollectionEntry<'locations'>) {
		const regionPrimary = getFirstRegionByReference(entry.data.regions);
		const regionLangCode = regionPrimary?.data._langCode;

		// Some entries in Taiwan also have Japanese titles; we'd like to display this as well
		const langCodeAdditional =
			regionPrimary?.id === 'taiwan' || regionPrimary?.data._ancestors?.includes('taiwan')
				? LanguageCodeEnum.Japanese
				: undefined;

		const titleResult = getMultilingualContent({
			data: entry.data,
			prop: 'title',
			...(regionLangCode ? { langCode: regionLangCode } : {}),
			...(langCodeAdditional ? { langCodeAdditional } : {}),
		});

		return {
			regionPrimary,
			regionLangCode,
			titleMultilingual: titleResult?.primary,
			titleMultilingualAdditional: titleResult?.additional ? [titleResult.additional] : undefined,
		};
	};
}

export async function queryLocationsIndex() {
	const { entries } = await getLocationsCollection();

	const getContentMetadata = await createContentMetadataFunction();

	return R.pipe(
		entries,
		R.filter(createFilterEntryQualityFunction(2)),
		R.filter((item) => !!item.data.imageFeatured),
		getContentMetadata,
		R.sort(sortContentMetadataByDate),
	);
}
