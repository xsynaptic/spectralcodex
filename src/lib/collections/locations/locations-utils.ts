import type { CollectionEntry } from 'astro:content';
import type { Thing, WithContext } from 'schema-dts';

import { getLocationsCollection } from '#lib/collections/locations/locations-data.ts';
import {
	getFirstRegionByReferenceFunction,
	getRegionAncestorsFunction,
} from '#lib/collections/regions/regions-utils.ts';
import { getTranslations } from '#lib/i18n/i18n-translations.ts';
import { getContentUrl, getSiteUrl } from '#lib/utils/routing.ts';
import { buildBreadcrumbSchema, buildPlaceSchema } from '#lib/utils/schema.ts';

// Transform IDs into entries (and emit a warning when an ID doesn't match)
export async function getLocationsByIdsFunction() {
	const { locationsMap } = await getLocationsCollection();

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
export async function getLocationsByPostsFunction() {
	const { locationsMap } = await getLocationsCollection();

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

function getFirstCoordinates(
	entry: CollectionEntry<'locations'>,
): [number, number] | undefined {
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
): Promise<Array<WithContext<Thing>>> {
	if (entry.data.override || (entry.data.hideLocation && !import.meta.env.DEV)) {
		return [];
	}

	const t = getTranslations();

	const getFirstRegionByReference = await getFirstRegionByReferenceFunction();
	const getRegionAncestors = await getRegionAncestorsFunction();

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
		buildBreadcrumbSchema(breadcrumbItems),
		buildPlaceSchema({
			title: entry.data.title,
			description: entry.data.description,
			url: props.url,
			coordinates: getFirstCoordinates(entry),
		}),
	];
}
