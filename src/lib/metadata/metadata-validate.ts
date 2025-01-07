import type { CollectionEntry } from 'astro:content';

import { MAP_GEOMETRY_COORDINATES_PRECISION } from '@/constants';

// Check for duplicate locations entered by mistake
// We do this here instead of at the schema level because Zod doesn't have context
export function validateLocations(locations: Array<CollectionEntry<'locations'>>) {
	const locationTitle = new Set<string>();
	const locationTitleAlt = new Set<string>();
	const locationAddress = new Set<string>();
	const locationGoogleMapsLinks = new Set<string>();
	const locationCoordinates = new Set<string>();

	locations.some((location) => {
		const title = location.data.title;

		if (locationTitle.has(title)) {
			throw new Error(`Duplicate title found for "${location.id}": ${title}`);
		}
		locationTitle.add(title);

		const titleAlt = location.data.titleAlt;

		if (titleAlt) {
			if (locationTitleAlt.has(titleAlt)) {
				throw new Error(`Duplicate titleAlt found for "${location.id}": ${titleAlt}`);
			}
			locationTitleAlt.add(titleAlt);
		}

		const address = location.data.address;

		if (address) {
			if (locationAddress.has(address)) {
				throw new Error(`Duplicate address found for "${location.id}": ${address}`);
			}
			locationTitleAlt.add(address);
		}

		const googleMapsLink = location.data.links?.find(({ url }) =>
			url.startsWith('https://maps.app.goo.gl'),
		)?.url;

		if (googleMapsLink) {
			if (locationGoogleMapsLinks.has(googleMapsLink)) {
				throw new Error(`Duplicate Google Maps link found for "${location.id}": ${googleMapsLink}`);
			}
			locationGoogleMapsLinks.add(googleMapsLink);
		}

		// Since Zod rounds the value and we might want to search for it let's shave off the last bit
		switch (location.data.geometry.type) {
			case 'MultiPoint':
			case 'LineString': {
				for (const coordinates of location.data.geometry.coordinates) {
					const coordinatesString = coordinates
						.map((coordinate) => coordinate.toString().slice(0, -1))
						.join('x');

					if (locationCoordinates.has(coordinatesString)) {
						throw new Error(
							`Duplicate coordinates found for "${location.id}": ${coordinatesString}`,
						);
					}
					locationCoordinates.add(coordinatesString);
				}
				break;
			}
			default: {
				const coordinatesString = location.data.geometry.coordinates
					.map((coordinate) => coordinate.toFixed(MAP_GEOMETRY_COORDINATES_PRECISION - 1))
					.join('x');

				if (locationCoordinates.has(coordinatesString)) {
					throw new Error(`Duplicate coordinates found for "${location.id}": ${coordinatesString}`);
				}
				locationCoordinates.add(coordinatesString);

				break;
			}
		}

		return false;
	});
}
