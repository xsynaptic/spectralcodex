import type { CollectionEntry } from 'astro:content';

import type { LocationTwHeritage } from '#lib/collections/locations/locations-schemas.ts';

// Union the top-level heritage with any per-point heritage, deduped
export function getLocationHeritage(
	entry: CollectionEntry<'locations'>,
): Array<LocationTwHeritage> {
	const { heritage, geometry } = entry.data;
	const points = Array.isArray(geometry) ? geometry : [geometry];
	const values = [
		...(heritage ? [heritage] : []),
		...points.flatMap((point) => (point.heritage ? [point.heritage] : [])),
	];
	return [...new Set(values)];
}

export function sortLocationsByLatitude(
	a: CollectionEntry<'locations'>,
	b: CollectionEntry<'locations'>,
) {
	function getLatitudeCoordinate(entry: CollectionEntry<'locations'>): number {
		return Array.isArray(entry.data.geometry)
			? Math.max(...entry.data.geometry.map(({ coordinates }) => coordinates[1]))
			: entry.data.geometry.coordinates[1];
	}

	return getLatitudeCoordinate(b) - getLatitudeCoordinate(a);
}
