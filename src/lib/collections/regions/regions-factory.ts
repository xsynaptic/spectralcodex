import type { CollectionEntry } from 'astro:content';

import { hash } from '@spectralcodex/shared/cache';

import type { RegionLanguage } from '#lib/collections/regions/regions-types.ts';
import type { Hierarchy } from '#lib/utils/hierarchy.ts';

import { RegionLanguageMap } from '#lib/collections/regions/regions-types.ts';
import { createHierarchy } from '#lib/utils/hierarchy.ts';

/**
 * Computed data cache
 */
type RegionComputedData = Pick<
	CollectionEntry<'regions'>['data'],
	| '_ancestors'
	| '_children'
	| '_siblings'
	| '_langCode'
	| '_locations'
	| '_locationCount'
	| '_posts'
	| '_postCount'
>;

// Cache of all region computed data, keyed by region ID
export type RegionComputedDataCache = Record<string, RegionComputedData>;

/**
 * Resolve the regions a location belongs to; overrides apply only in production
 */
export function resolveLocationRegions(entry: CollectionEntry<'locations'>) {
	if (import.meta.env.PROD && entry.data.override?.regions) return entry.data.override.regions;
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
 * Generate a stable cache key from the content graph state
 * This key changes when any region structure, location-region, or post-region relationship changes
 */
export function generateCacheKey({
	regions,
	locations,
	posts,
}: {
	regions: Array<CollectionEntry<'regions'>>;
	locations: Array<CollectionEntry<'locations'>>;
	posts: Array<CollectionEntry<'posts'>>;
}) {
	return hash({
		data: {
			regions: regions.map((entry) => ({
				id: entry.id,
				parent: entry.data.parent,
			})),
			locations: locations.map((entry) => ({
				id: entry.id,
				regions: resolveLocationRegions(entry).map(({ id }) => id),
			})),
			posts: posts.map((entry) => ({
				id: entry.id,
				regions: entry.data.regions?.map(({ id }) => id),
			})),
			// Language codes are computed data, so changes to the map must invalidate the cache
			regionLanguageMap: RegionLanguageMap,
			version: 2,
		},
	});
}

/**
 * Apply cache computed data back to fresh collection entries
 */
export function applyComputedDataCache(
	regions: Array<CollectionEntry<'regions'>>,
	computedDataCache: RegionComputedDataCache,
) {
	for (const entry of regions) {
		const entryComputedData = computedDataCache[entry.id];

		// Merge all computed fields from cache into the entry
		if (entryComputedData) Object.assign(entry.data, entryComputedData);
	}
}

/**
 * Extract computed data from processed entries for caching
 */
export function extractComputedData(
	regions: Array<CollectionEntry<'regions'>>,
): RegionComputedDataCache {
	const computedDataCache: RegionComputedDataCache = {};

	for (const entry of regions) {
		const {
			_ancestors,
			_children,
			_siblings,
			_langCode,
			_locations,
			_locationCount,
			_posts,
			_postCount,
		} = entry.data;

		computedDataCache[entry.id] = {
			_ancestors,
			_children,
			_siblings,
			_langCode,
			_locations,
			_locationCount,
			_posts,
			_postCount,
		};
	}
	return computedDataCache;
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
	// Generate locations and posts by region maps; this will make subsequent calculations faster
	const locationsByRegionMap = new Map<string, Array<string>>();

	for (const entry of locations) {
		for (const { id: regionId } of resolveLocationRegions(entry)) {
			if (!locationsByRegionMap.has(regionId)) {
				locationsByRegionMap.set(regionId, []);
			}
			locationsByRegionMap.get(regionId)!.push(entry.id);
		}
	}

	const postsByRegionMap = new Map<string, Array<string>>();

	for (const entry of posts) {
		if (entry.data.regions) {
			for (const { id: regionId } of entry.data.regions) {
				if (!postsByRegionMap.has(regionId)) {
					postsByRegionMap.set(regionId, []);
				}
				postsByRegionMap.get(regionId)!.push(entry.id);
			}
		}
	}

	// Calculate cumulative post and location count
	for (const entry of entries) {
		const entries = [entry.id, ...regionsTree.descendantsOf(entry.id)];

		entry.data._locations = [
			...new Set(entries.flatMap((id) => locationsByRegionMap.get(id))),
		].filter((item): item is string => !!item);
		entry.data._locationCount = entry.data._locations.length;
		entry.data._posts = [...new Set(entries.flatMap((id) => postsByRegionMap.get(id)))].filter(
			(item): item is string => !!item,
		);
		entry.data._postCount = entry.data._posts.length;
	}
}
