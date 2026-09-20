import type { CollectionEntry } from 'astro:content';

interface ContentPolicy {
	applyOverrides: boolean;
	hideSensitiveLocations: boolean;
}

// Two fields from one condition so call sites name the rule they implement, not the environment
export const contentPolicy = {
	applyOverrides: !import.meta.env.DEV,
	hideSensitiveLocations: !import.meta.env.DEV,
} satisfies ContentPolicy;

export function collectHiddenLocationIds(
	locations: Array<CollectionEntry<'locations'>>,
): Set<string> {
	if (!contentPolicy.hideSensitiveLocations) return new Set<string>();

	return new Set(locations.filter(({ data }) => data.hideLocation).map(({ id }) => id));
}
