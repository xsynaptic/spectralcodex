import type { CollectionEntry } from 'astro:content';

import * as R from 'remeda';

import type { RegionLanguage } from '#lib/collections/regions/regions-types.ts';
import type { Hierarchy } from '#lib/utils/hierarchy.ts';

import { RegionLanguageMap } from '#lib/collections/regions/regions-types.ts';
import {
	collectUnlistedLocationIds,
	countContent,
	getEffectiveLocationData,
} from '#lib/utils/content-policy.ts';
import { createHierarchy } from '#lib/utils/hierarchy.ts';

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

export function createRegionContentFunction({
	locations,
	posts,
	regionsTree,
}: {
	locations: Array<CollectionEntry<'locations'>>;
	posts: Array<CollectionEntry<'posts'>>;
	regionsTree: Hierarchy;
}) {
	const locationsByRegionMap = mapEntriesByRegion(
		locations,
		(entry) => getEffectiveLocationData(entry.data).regions,
	);
	const postsByRegionMap = mapEntriesByRegion(posts, (entry) => entry.data.regions);

	const unlistedLocationIds = collectUnlistedLocationIds(locations);

	return function getRegionContent(regionId: string) {
		const regionIds = [regionId, ...regionsTree.descendantsOf(regionId)];

		const regionLocations = collectByRegion(regionIds, locationsByRegionMap);
		const regionPosts = collectByRegion(regionIds, postsByRegionMap);

		return {
			_locations: regionLocations,
			_posts: regionPosts,
			...countContent({ locations: regionLocations, posts: regionPosts, unlistedLocationIds }),
		};
	};
}

export function getRegionHierarchy(regionsTree: Hierarchy, regionId: string) {
	return {
		_ancestors: [...regionsTree.ancestorsOf(regionId)],
		_children: [...regionsTree.childrenOf(regionId)],
		_siblings: [...regionsTree.siblingsOf(regionId)],
	};
}

export function getRegionLangCode(
	entry: CollectionEntry<'regions'>,
	ancestors: Array<string>,
): RegionLanguage | undefined {
	if (ancestors.length > 0) return getRegionLanguageById(ancestors.at(-1));
	if (!entry.data.parent) return getRegionLanguageById(entry.id);

	return undefined;
}

function collectByRegion(regionIds: Array<string>, map: Map<string, Array<string>>): Array<string> {
	return R.pipe(
		regionIds,
		R.flatMap((id) => map.get(id) ?? []),
		R.unique(),
	);
}

function getRegionLanguageById(
	regionId: CollectionEntry<'regions'>['id'] | undefined,
): RegionLanguage | undefined {
	return regionId && isRegionWithLanguage(regionId) ? RegionLanguageMap[regionId] : undefined;
}

function isRegionWithLanguage(
	region: CollectionEntry<'regions'>['id'],
): region is keyof typeof RegionLanguageMap {
	return Object.hasOwn(RegionLanguageMap, region);
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
