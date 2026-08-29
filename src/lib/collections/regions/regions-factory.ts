import type { CollectionEntry } from 'astro:content';

import type { RegionLanguage } from '#lib/collections/regions/regions-types.ts';
import type { Hierarchy } from '#lib/utils/hierarchy.ts';

import { RegionLanguageMap } from '#lib/collections/regions/regions-types.ts';
import { contentPolicy } from '#lib/utils/content-policy.ts';
import { createHierarchy } from '#lib/utils/hierarchy.ts';

export function resolveLocationRegions(entry: CollectionEntry<'locations'>) {
	if (contentPolicy.applyOverrides && entry.data.override?.regions) {
		return entry.data.override.regions;
	}
	return entry.data.regions;
}

/**
 * Validate parent references and build the regions hierarchy
 * One tree drives both the materialized closure fields and the map nested-set
 */
export function createRegionsTree(entries: Array<CollectionEntry<'regions'>>): Hierarchy {
	for (const entry of entries) {
		if (entry.data.parent === entry.id) {
			throw new Error(`Error: region "${entry.id}" cannot be its own parent!`);
		}
	}

	return createHierarchy(
		entries.map((entry) =>
			entry.data.parent === undefined
				? { id: entry.id }
				: { id: entry.id, parentId: entry.data.parent },
		),
	);
}

/**
 * Computed data functions; populate the materialized closure fields onto entries from the hierarchy
 */
export function populateRegionsHierarchy(
	regions: Array<CollectionEntry<'regions'>>,
	regionsTree: Hierarchy,
) {
	for (const entry of regions) {
		const ancestors = regionsTree.ancestorsOf(entry.id);

		if (ancestors.length > 0) entry.data._ancestors = [...ancestors];

		const children = regionsTree.childrenOf(entry.id);

		if (children.length > 0) entry.data._children = [...children];

		const siblings = regionsTree.siblingsOf(entry.id);

		if (siblings.length > 0) entry.data._siblings = [...siblings];
	}
}

function isRegionWithLanguage(
	region: CollectionEntry<'regions'>['id'],
): region is keyof typeof RegionLanguageMap {
	return Object.hasOwn(RegionLanguageMap, region);
}

function getRegionLanguageById(
	regionId: CollectionEntry<'regions'>['id'] | undefined,
): RegionLanguage | undefined {
	return regionId && isRegionWithLanguage(regionId) ? RegionLanguageMap[regionId] : undefined;
}

// Assign language code, where applicable
export function populateRegionsLangCode(regions: Array<CollectionEntry<'regions'>>) {
	// Assign language code, where applicable
	for (const entry of regions) {
		if (entry.data._ancestors && entry.data._ancestors.length > 0) {
			entry.data._langCode = getRegionLanguageById(entry.data._ancestors.at(-1));
		} else if (!entry.data.parent) {
			entry.data._langCode = getRegionLanguageById(entry.id);
		}
	}
}

function mapEntriesByRegion<T extends { id: string }>(
	entries: Array<T>,
	getRegions: (entry: T) => Array<{ id: string }> | undefined,
) {
	const map = new Map<string, Array<string>>();

	for (const entry of entries) {
		const regions = getRegions(entry) ?? [];

		for (const { id: regionId } of regions) {
			const entryIds = map.get(regionId) ?? [];

			entryIds.push(entry.id);
			map.set(regionId, entryIds);
		}
	}

	return map;
}

function collectByRegion(regionIds: Array<string>, map: Map<string, Array<string>>): Array<string> {
	return [...new Set(regionIds.flatMap((id) => map.get(id)))].filter(
		(item): item is string => !!item,
	);
}

export function populateRegionsContent({
	entries,
	locations,
	posts,
	regionsTree,
}: {
	entries: Array<CollectionEntry<'regions'>>;
	locations: Array<CollectionEntry<'locations'>>;
	posts: Array<CollectionEntry<'posts'>>;
	regionsTree: Hierarchy;
}) {
	// Generate content by region maps; this will make subsequent calculations faster
	const locationsByRegionMap = mapEntriesByRegion(locations, resolveLocationRegions);
	const postsByRegionMap = mapEntriesByRegion(posts, (entry) => entry.data.regions);

	// Calculate cumulative content counts, rolled up through descendants
	for (const entry of entries) {
		const regionIds = [entry.id, ...regionsTree.descendantsOf(entry.id)];

		entry.data._locations = collectByRegion(regionIds, locationsByRegionMap);
		entry.data._locationCount = entry.data._locations.length;
		entry.data._posts = collectByRegion(regionIds, postsByRegionMap);
		entry.data._postCount = entry.data._posts.length;
		entry.data._entryCount = entry.data._locationCount + entry.data._postCount;
	}
}
