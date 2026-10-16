import type { CollectionEntry } from 'astro:content';

import type { Thing } from '#lib/utils/seo-structured-data.ts';

import {
	createFirstRegionByReferenceFunction,
	createRegionAncestorsFunction,
} from '#lib/collections/regions/regions-data.ts';
import { isGeometryHidden } from '#lib/utils/content-policy.ts';
import { getDescriptionRenderedText } from '#lib/utils/description-data.ts';
import { buildEntryBreadcrumbSchema, buildPlaceSchema } from '#lib/utils/seo-structured-data.ts';

export async function getLocationStructuredData(
	entry: CollectionEntry<'locations'>,
	props: { url: string },
): Promise<Array<Thing>> {
	if (entry.data.override || isGeometryHidden(entry)) {
		return [];
	}

	const getFirstRegionByReference = await createFirstRegionByReferenceFunction();
	const getRegionAncestors = await createRegionAncestorsFunction();

	const regionPrimary = getFirstRegionByReference(entry.data.regions);
	const regionAncestors = regionPrimary ? getRegionAncestors(regionPrimary).toReversed() : [];

	return [
		buildEntryBreadcrumbSchema({
			collection: 'locations',
			regions: regionAncestors,
			title: entry.data.title,
			url: props.url,
		}),
		buildPlaceSchema({
			coordinates: getFirstCoordinates(entry),
			description: getDescriptionRenderedText(entry),
			title: entry.data.title,
			url: props.url,
		}),
	];
}

function getFirstCoordinates(entry: CollectionEntry<'locations'>): [number, number] | undefined {
	const geometry = entry.data.geometry;
	const point = Array.isArray(geometry) ? geometry[0] : geometry;

	if (!point) return undefined;

	return [point.coordinates[0], point.coordinates[1]];
}
