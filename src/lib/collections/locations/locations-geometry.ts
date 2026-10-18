import type { Position } from 'geojson';

import type { ComputedEntry } from '#lib/collections/collections-types.ts';
import type { LocationTwHeritage } from '#lib/collections/locations/locations-schemas.ts';

import { mapGeometryCoordinatesPrecision } from '#constants.ts';
import { getMultilingualContent } from '#lib/i18n/i18n-utils.ts';
import { renderMarkdownInline } from '#lib/utils/text.ts';

function getPoints(entry: ComputedEntry<'locations'>) {
	const { geometry } = entry.data;

	return Array.isArray(geometry) ? geometry : [geometry];
}

function getCoordinatesText(coordinates: Position) {
	const [longitude = 0, latitude = 0] = coordinates;

	return `${latitude.toFixed(mapGeometryCoordinatesPrecision)}, ${longitude.toFixed(mapGeometryCoordinatesPrecision)}`;
}

// Union the top-level heritage with any per-point heritage, deduped
function getLocationHeritage(entry: ComputedEntry<'locations'>): Array<LocationTwHeritage> {
	const { heritage } = entry.data;
	const values = [
		...(heritage ? [heritage] : []),
		...getPoints(entry).flatMap((point) => (point.heritage ? [point.heritage] : [])),
	];
	return [...new Set(values)];
}

export function getLocationPoints(entry: ComputedEntry<'locations'>) {
	const points = getPoints(entry);

	if (points.length < 2) return;

	return points.map((point) => ({
		descriptionHtml: point.description ? renderMarkdownInline(point.description) : undefined,
		googleMapsUrl: point.googleMapsUrl,
		heritage: point.heritage === entry.data.heritage ? undefined : point.heritage,
		status: point.status ?? entry.data.status,
		title: point.title,
		titleMultilingual: getMultilingualContent({ data: point, prop: 'title' })?.primary,
		wikipediaUrl: point.wikipediaUrl,
	}));
}

export function getLocationDetails(entry: ComputedEntry<'locations'>) {
	const points = getPoints(entry);
	const [point] = points;

	return {
		coordinates: point && points.length === 1 ? getCoordinatesText(point.coordinates) : undefined,
		heritage: getLocationHeritage(entry),
		status: entry.data.status,
	};
}

export function sortLocationsByLatitude(
	a: ComputedEntry<'locations'>,
	b: ComputedEntry<'locations'>,
) {
	function getLatitudeCoordinate(entry: ComputedEntry<'locations'>): number {
		return Array.isArray(entry.data.geometry)
			? Math.max(...entry.data.geometry.map(({ coordinates }) => coordinates[1]))
			: entry.data.geometry.coordinates[1];
	}

	return getLatitudeCoordinate(b) - getLatitudeCoordinate(a);
}
