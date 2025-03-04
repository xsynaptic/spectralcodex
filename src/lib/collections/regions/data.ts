import type { CollectionEntry } from 'astro:content';

import { getCollection } from 'astro:content';
import { performance } from 'node:perf_hooks';

interface CollectionData {
	regions: Array<CollectionEntry<'regions'>>;
	regionsMap: Map<string, CollectionEntry<'regions'>>;
}

let collection: Promise<CollectionData> | undefined;

async function generateCollection() {
	const startTime = performance.now();

	const locations = await getCollection('locations');
	const posts = await getCollection('posts');
	const regions = await getCollection('regions');

	// Calculate ancestors
	for (const entry of regions) {
		if (entry.data.parent) {
			let current = entry;

			while (current.data.parent?.id) {
				const parent = regions.find(({ id }) => id === current.data.parent?.id);

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
		const children = regions.filter(({ data }) => data.parent?.id === entry.id);

		if (children.length > 0) {
			entry.data.children = children.map(({ id }) => id);
		}

		// Do not include the current term, and also handle ancestral terms
		const siblings = regions.filter(({ id, data }) => {
			if (id === entry.id) return false;

			return entry.data.parent
				? data.parent?.id === entry.data.parent.id
				: data.parent?.id === undefined;
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

	const regionsMap = new Map<string, CollectionEntry<'regions'>>();

	for (const entry of regions) {
		regionsMap.set(entry.id, entry);
	}

	console.log(
		`[Regions] Collection data generated in ${Number(performance.now() - startTime).toFixed(5)}ms`,
	);

	return { regions, regionsMap };
}

export async function getRegionsCollection() {
	if (!collection) {
		collection = generateCollection();
	}
	return collection;
}
