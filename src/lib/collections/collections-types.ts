import type { CollectionEntry, CollectionKey } from 'astro:content';

import type { getLocationsCollection } from '#lib/collections/locations/locations-data.ts';
import type { getRegionsCollection } from '#lib/collections/regions/regions-data.ts';
import type { getResourcesCollection } from '#lib/collections/resources/resources-data.ts';
import type { getSeriesCollection } from '#lib/collections/series/series-data.ts';
import type { getThemesCollection } from '#lib/collections/themes/themes-data.ts';

type CollectionDataEntry<F extends () => Promise<{ entries: Array<unknown> }>> = Awaited<
	ReturnType<F>
>['entries'][number];

interface ComputedEntryMap {
	locations: CollectionDataEntry<typeof getLocationsCollection>;
	regions: CollectionDataEntry<typeof getRegionsCollection>;
	resources: CollectionDataEntry<typeof getResourcesCollection>;
	series: CollectionDataEntry<typeof getSeriesCollection>;
	themes: CollectionDataEntry<typeof getThemesCollection>;
}

export type ComputedEntry<K extends CollectionKey> = K extends keyof ComputedEntryMap
	? ComputedEntryMap[K]
	: CollectionEntry<K>;
