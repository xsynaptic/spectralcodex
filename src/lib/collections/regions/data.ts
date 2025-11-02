import type { CollectionEntry } from 'astro:content';

import { getCollection } from 'astro:content';
import { performance } from 'node:perf_hooks';

import type { RegionLanguage } from '#lib/collections/regions/types.ts';

import { RegionLanguageMap } from '#lib/collections/regions/types.ts';
import { getCacheInstance, hashData } from '#lib/utils/cache.ts';

interface CollectionData {
	regions: Array<CollectionEntry<'regions'>>;
	regionsMap: Map<string, CollectionEntry<'regions'>>;
}

type RegionComputedData = Pick<
	CollectionEntry<'regions'>['data'],
	| 'ancestors'
	| 'children'
	| 'siblings'
	| 'descendants'
	| 'langCode'
	| 'locations'
	| 'locationCount'
	| 'posts'
	| 'postCount'
>;

// Cache of all region computed data, keyed by region ID
type RegionsCacheData = Record<string, RegionComputedData>;

let collection: Promise<CollectionData> | undefined;

const cacheInstance = getCacheInstance('regions-collection');

/**
 * Generate a stable cache key from the content graph state
 * This key changes when any region structure, location-region, or post-region relationship changes
 */
async function generateCacheKey({
	regions,
	locations,
	posts,
}: {
	regions: Array<CollectionEntry<'regions'>>;
	locations: Array<CollectionEntry<'locations'>>;
	posts: Array<CollectionEntry<'posts'>>;
}) {
	return hashData({
		data: {
			regions: regions.map((entry) => ({
				id: entry.id,
				parent: entry.data.parent,
			})),
			locations: locations.map((entry) => ({
				id: entry.id,
				regions: entry.data.regions.map(({ id }) => id),
			})),
			posts: posts.map((entry) => ({
				id: entry.id,
				regions: entry.data.regions?.map(({ id }) => id),
			})),
		},
	});
}

/**
 * Apply cached computed data back to fresh collection entries
 */
function applyCachedData(regions: Array<CollectionEntry<'regions'>>, cachedData: RegionsCacheData) {
	for (const entry of regions) {
		const cached = cachedData[entry.id];

		// Merge all computed fields from cache into the entry
		if (cached) {
			if (cached.ancestors) entry.data.ancestors = cached.ancestors;
			if (cached.children) entry.data.children = cached.children;
			if (cached.siblings) entry.data.siblings = cached.siblings;
			if (cached.descendants) entry.data.descendants = cached.descendants;
			if (cached.langCode) entry.data.langCode = cached.langCode;
			if (cached.locations) entry.data.locations = cached.locations;
			if (cached.locationCount !== undefined) entry.data.locationCount = cached.locationCount;
			if (cached.posts) entry.data.posts = cached.posts;
			if (cached.postCount !== undefined) entry.data.postCount = cached.postCount;
		}
	}
}

/**
 * Extract computed data from processed entries for caching
 */
function extractComputedData(regions: Array<CollectionEntry<'regions'>>): RegionsCacheData {
	const cacheData: RegionsCacheData = {};

	for (const entry of regions) {
		const computed: RegionComputedData = {};

		if (entry.data.ancestors) computed.ancestors = entry.data.ancestors;
		if (entry.data.children) computed.children = entry.data.children;
		if (entry.data.siblings) computed.siblings = entry.data.siblings;
		if (entry.data.descendants) computed.descendants = entry.data.descendants;
		if (entry.data.langCode) computed.langCode = entry.data.langCode;
		if (entry.data.locations) computed.locations = entry.data.locations;
		if (entry.data.locationCount !== undefined) computed.locationCount = entry.data.locationCount;
		if (entry.data.posts) computed.posts = entry.data.posts;
		if (entry.data.postCount !== undefined) computed.postCount = entry.data.postCount;

		cacheData[entry.id] = computed;
	}

	return cacheData;
}

function populateRegionsHierarchy(regions: Array<CollectionEntry<'regions'>>) {
	// Calculate ancestors
	for (const entry of regions) {
		if (entry.data.parent) {
			if (entry.id === entry.data.parent) {
				throw new Error(`Error: region "${entry.id}" cannot be its own parent!`);
			}

			let current = entry;

			while (current.data.parent) {
				const parent = regions.find(({ id }) => id === current.data.parent);

				if (!parent) break;

				if (entry.data.ancestors) {
					entry.data.ancestors.push(parent.id);
				} else {
					entry.data.ancestors = [parent.id];
				}
				current = parent;
			}
		}
	}

	// Calculate children, siblings, and descendants
	for (const entry of regions) {
		const children = regions.filter(({ data }) => data.parent === entry.id);

		if (children.length > 0) {
			entry.data.children = children.map(({ id }) => id);
		}

		// Do not include the current term, and also handle ancestral terms
		const siblings = regions.filter(({ id, data }) => {
			if (id === entry.id) return false;

			return entry.data.parent ? data.parent === entry.data.parent : data.parent === undefined;
		});

		if (siblings.length > 0) {
			entry.data.siblings = siblings.map(({ id }) => id);
		}

		// Calculate descendants
		if (entry.data.ancestors) {
			for (const ancestorId of entry.data.ancestors) {
				const ancestor = regions.find(({ id }) => id === ancestorId);

				if (!ancestor || ancestor.id === entry.id) continue;

				if (ancestor.data.descendants) {
					ancestor.data.descendants.push(entry.id);
				} else {
					ancestor.data.descendants = [entry.id];
				}
			}
		}
	}
}

function isRegionWithLanguage(
	region: CollectionEntry<'regions'>['id'],
): region is keyof typeof RegionLanguageMap {
	return region in RegionLanguageMap;
}

function getRegionLanguageById(
	regionId: CollectionEntry<'regions'>['id'] | undefined,
): RegionLanguage | undefined {
	return regionId && isRegionWithLanguage(regionId) ? RegionLanguageMap[regionId] : undefined;
}

// Assign language code, where applicable
function populateRegionsLangCode(regions: Array<CollectionEntry<'regions'>>) {
	// Assign language code, where applicable
	for (const entry of regions) {
		if (entry.data.ancestors && entry.data.ancestors.length > 0) {
			entry.data.langCode = getRegionLanguageById(entry.data.ancestors.at(-1));
		} else if (!entry.data.parent) {
			entry.data.langCode = getRegionLanguageById(entry.id);
		}
	}
}

async function populateRegionsContent({
	regions,
	locations,
	posts,
}: {
	regions: Array<CollectionEntry<'regions'>>;
	locations: Array<CollectionEntry<'locations'>>;
	posts: Array<CollectionEntry<'posts'>>;
}) {
	// Generate locations and posts by region maps; this will make subsequent calculations faster
	const locationsByRegionMap = new Map<string, Array<string>>();

	for (const entry of locations) {
		for (const { id: regionId } of entry.data.regions) {
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
	for (const entry of regions) {
		const entries = entry.data.descendants ? [entry.id, ...entry.data.descendants] : [entry.id];

		entry.data.locations = [
			...new Set(entries.flatMap((id) => locationsByRegionMap.get(id))),
		].filter((item): item is string => !!item);
		entry.data.locationCount = entry.data.locations.length;
		entry.data.posts = [...new Set(entries.flatMap((id) => postsByRegionMap.get(id)))].filter(
			(item): item is string => !!item,
		);
		entry.data.postCount = entry.data.posts.length;
	}
}

async function generateCollection() {
	const startTime = performance.now();

	const regions = await getCollection('regions');
	const locations = await getCollection('locations');
	const posts = await getCollection('posts');

	// Generate cache key from current content graph state
	const cacheKey = await generateCacheKey({ regions, locations, posts });
	const cachedData = await cacheInstance.get<RegionsCacheData>(cacheKey);

	if (cachedData) {
		applyCachedData(regions, cachedData);

		console.log(
			`[Regions] Collection data loaded from cache in ${(performance.now() - startTime).toFixed(5)}ms`,
		);
	} else {
		populateRegionsHierarchy(regions);
		populateRegionsLangCode(regions);
		await populateRegionsContent({ regions, locations, posts });

		// Extract and cache the computed data
		await cacheInstance.set(cacheKey, extractComputedData(regions));

		console.log(
			`[Regions] Collection data generated in ${(performance.now() - startTime).toFixed(5)}ms`,
		);
	}

	// Assign all data to the map and collection
	const regionsMap = new Map<string, CollectionEntry<'regions'>>();

	for (const entry of regions) {
		regionsMap.set(entry.id, entry);
	}

	return { regions, regionsMap };
}

export async function getRegionsCollection() {
	if (!collection) {
		collection = generateCollection();
	}
	return collection;
}
