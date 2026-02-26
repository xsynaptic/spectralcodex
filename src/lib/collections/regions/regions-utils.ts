import type { CollectionEntry, ReferenceDataEntry } from 'astro:content';
import type { Thing } from 'schema-dts';

import { getRegionsCollection } from '#lib/collections/regions/regions-data.ts';
import { getTranslations } from '#lib/i18n/i18n-translations.ts';
import { getContentUrl, getSiteUrl } from '#lib/utils/routing.ts';
import { buildBreadcrumbSchema } from '#lib/utils/schema.ts';

/**
 * Transform an array of strings into collection entries
 */
export async function getRegionsByIdsFunction() {
	const { regionsMap } = await getRegionsCollection();

	return function getRegionsById(ids: Array<string>) {
		return ids
			.map((id) => {
				const entry = regionsMap.get(id);

				if (!entry && import.meta.env.DEV) {
					console.warn(`[Regions] Requested entry "${id}" not found!`);
				}
				return entry;
			})
			.filter((entry): entry is CollectionEntry<'regions'> => !!entry) satisfies Array<
			CollectionEntry<'regions'>
		>;
	};
}

/**
 * Hierarchical functions
 */
// Get all ancestors of the specified region
export async function getRegionAncestorsFunction() {
	const getRegionsById = await getRegionsByIdsFunction();

	return function getRegionAncestors(region: CollectionEntry<'regions'>) {
		const ancestors = region.data._ancestors ? getRegionsById(region.data._ancestors) : [];

		return [region, ...ancestors] satisfies Array<CollectionEntry<'regions'>>;
	};
}

// References are not the complete entry; they still need to be fetched from the collection
export async function getRegionAncestorsByIdFunction() {
	const { regionsMap } = await getRegionsCollection();
	const getRegionAncestors = await getRegionAncestorsFunction();

	return function getRegionAncestorsById(regionId: string) {
		const region = regionsMap.get(regionId);

		if (!region)
			throw new Error(`Error: could not find "${regionId}" in the "regions" collection.`);

		return getRegionAncestors(region) satisfies Array<CollectionEntry<'regions'>>;
	};
}

// A utility function to find the common ancestor ID from an arbitrary set of regions
// Used when generating content metadata
export async function getRegionCommonAncestorFunction() {
	const getRegionsById = await getRegionsByIdsFunction();
	const getRegionAncestors = await getRegionAncestorsFunction();

	return function getRegionCommonAncestor(regionIds: Array<string>): string | undefined {
		const regions = getRegionsById(regionIds);

		if (regions.length === 0) return;

		const regionAncestors = regions.map(getRegionAncestors);

		if (!regionAncestors[0]) return;

		for (const ancestor of regionAncestors[0]) {
			if (regionAncestors.every((regionAncestor) => regionAncestor.includes(ancestor))) {
				return ancestor.id;
			}
		}
		return;
	};
}

/**
 * Primary region
 */
// Return the first region from an array of region references
export async function getFirstRegionByReferenceFunction() {
	const { regionsMap } = await getRegionsCollection();

	return function getFirstRegionByReference(
		regions: Array<ReferenceDataEntry<'regions'>> | undefined,
	): CollectionEntry<'regions'> | undefined {
		if (!regions) return;

		const regionId = regions.at(0)?.id;

		return regionId ? regionsMap.get(regionId) : undefined;
	};
}

/**
 * Language code
 */
export async function getRegionLangCodeByEntry(
	entry: CollectionEntry<'locations' | 'regions' | 'resources' | 'series' | 'themes'>,
) {
	const getFirstRegionByReference = await getFirstRegionByReferenceFunction();

	if (entry.collection === 'regions') {
		return entry.data._langCode;
	} else if (entry.collection === 'locations') {
		return getFirstRegionByReference(entry.data.override?.regions ?? entry.data.regions)?.data
			._langCode;
	} else {
		return getFirstRegionByReference(entry.data.regions)?.data._langCode;
	}
}

/**
 * Schema
 */
export async function getRegionSchema(
	entry: CollectionEntry<'regions'>,
	props: { url: string },
): Promise<Array<Thing>> {
	const t = getTranslations();

	const getRegionAncestors = await getRegionAncestorsFunction();

	const allAncestors = getRegionAncestors(entry);
	const ancestors = allAncestors.slice(1).toReversed();

	const breadcrumbItems = [
		{ name: t('site.title'), url: getSiteUrl() },
		{ name: t('collection.regions.labelPlural'), url: getSiteUrl('regions') },
		...ancestors.map((region) => ({
			name: region.data.title,
			url: getContentUrl('regions', region.id),
		})),
		{ name: entry.data.title },
	];

	return [buildBreadcrumbSchema(breadcrumbItems, props.url)];
}
