import type { MapPopupItem } from '../types';

interface PopupCoordinates {
	lng: number;
	lat: number;
}

// Currently this handles Point and LineString geometry without complicated types
export const sanitizeCoordinates = (feature: MapPopupItem): PopupCoordinates => {
	if (
		typeof feature.geometry.coordinates[0] === 'number' &&
		typeof feature.geometry.coordinates[1] === 'number'
	) {
		return {
			lng: feature.geometry.coordinates[0],
			lat: feature.geometry.coordinates[1],
		};
	}

	if (Array.isArray(feature.geometry.coordinates[0])) {
		return {
			lng: feature.geometry.coordinates[0][0],
			lat: feature.geometry.coordinates[0][1],
		};
	}

	return { lng: 0, lat: 0 };
};

// Generate a standard Google Maps URL from a set of coordinates
export function getGoogleMapsUrlFromGeometry(coordinates: PopupCoordinates) {
	const url = new URL('https://www.google.com/maps/search/');

	url.searchParams.set('api', '1');
	url.searchParams.set('query', `${String(coordinates.lat)},${String(coordinates.lng)}`);

	return url.toString();
}
