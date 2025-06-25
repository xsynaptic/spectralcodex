import type { MapPopupCoordinates } from '../types';

// Generate a standard Google Maps URL from a set of coordinates
export function getGoogleMapsUrlFromGeometry(coordinates: MapPopupCoordinates) {
	const url = new URL('https://www.google.com/maps/search/');

	url.searchParams.set('api', '1');
	url.searchParams.set('query', `${String(coordinates.lat)},${String(coordinates.lng)}`);

	return url.toString();
}
