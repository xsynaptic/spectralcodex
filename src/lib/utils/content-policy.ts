import type { CollectionEntry } from 'astro:content';

import { applyLocationOverride, entryQualityFloor } from '@spectralcodex/shared/entries';

interface ContentPolicy {
	applyOverrides: boolean;
	hideSensitiveLocations: boolean;
}

// Two fields from one condition, so call sites name the rule they implement rather than the environment
export const contentPolicy = {
	applyOverrides: !import.meta.env.DEV,
	hideSensitiveLocations: !import.meta.env.DEV,
} satisfies ContentPolicy;

export function isListedQuality({ entryQuality }: { entryQuality: number }) {
	return entryQuality >= entryQualityFloor.listed;
}

export function isFeaturedQuality({ entryQuality }: { entryQuality: number }) {
	return entryQuality >= entryQualityFloor.featured;
}

export function isListed({ hideFromLists }: { hideFromLists?: boolean | undefined }) {
	return hideFromLists !== true;
}

export function isGeometryHidden(entry: CollectionEntry<'locations'>) {
	return entry.data.hideGeometry === true && contentPolicy.hideSensitiveLocations;
}

export function collectUnlistedLocationIds(
	locations: Array<CollectionEntry<'locations'>>,
): Set<string> {
	return new Set(locations.filter(({ data }) => !isListed(data)).map(({ id }) => id));
}

export function getEffectiveLocationData(data: CollectionEntry<'locations'>['data']) {
	return contentPolicy.applyOverrides ? applyLocationOverride(data) : data;
}

export function countContent({
	locations,
	posts,
	unlistedLocationIds,
}: {
	locations: Array<string>;
	posts: Array<string>;
	unlistedLocationIds: Set<string>;
}) {
	const locationCount = locations.filter((id) => !unlistedLocationIds.has(id)).length;

	return {
		_entryCount: locationCount + posts.length,
		_locationCount: locationCount,
		_postCount: posts.length,
	};
}
