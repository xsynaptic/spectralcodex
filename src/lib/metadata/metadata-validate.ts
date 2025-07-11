import type { CollectionEntry } from 'astro:content';

import { MAP_GEOMETRY_COORDINATES_PRECISION } from '#constants.ts';
import { getMultilingualContent } from '#lib/i18n/i18n-utils.ts';

// Check for duplicate locations entered by mistake
// We do this here instead of at the schema level because Zod doesn't have context
export function validateLocations(locations: Array<CollectionEntry<'locations'>>) {
	const locationSlug = new Set<string>();
	const locationTitle = new Set<string>();
	const locationTitleMultilingual = new Set<string>();
	const locationAddress = new Set<string>();
	const locationGoogleMapsLinks = new Set<string>();
	const locationCoordinates = new Set<string>();

	locations.some((location) => {
		const slug = location.data.slug;

		if (locationSlug.has(slug)) {
			throw new Error(`Duplicate slug found for "${location.id}": ${slug}`);
		}
		locationSlug.add(slug);

		const title = location.data.title;

		if (locationTitle.has(title)) {
			throw new Error(`Duplicate title found for "${location.id}": ${title}`);
		}
		locationTitle.add(title);

		const titleMultilingual = getMultilingualContent(location.data, 'title');

		if (titleMultilingual) {
			const titleMultilingualString = `${titleMultilingual.value} (${titleMultilingual.lang})`;

			if (locationTitleMultilingual.has(titleMultilingualString)) {
				throw new Error(
					`Duplicate multilingual title found for "${location.id}": ${titleMultilingualString}`,
				);
			}
			locationTitleMultilingual.add(titleMultilingualString);
		}

		const address = location.data.address;

		if (address) {
			if (locationAddress.has(address)) {
				throw new Error(`Duplicate address found for "${location.id}": ${address}`);
			}
			locationTitleMultilingual.add(address);
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
		if (Array.isArray(location.data.geometry)) {
			for (const { coordinates } of location.data.geometry) {
				const coordinatesString = coordinates
					.map((coordinate) => coordinate.toString().slice(0, -1))
					.join('x');

				if (locationCoordinates.has(coordinatesString)) {
					throw new Error(`Duplicate coordinates found for "${location.id}": ${coordinatesString}`);
				}
				locationCoordinates.add(coordinatesString);
			}
		} else {
			const coordinatesString = location.data.geometry.coordinates
				.map((coordinate) => coordinate.toFixed(MAP_GEOMETRY_COORDINATES_PRECISION - 1))
				.join('x');

			if (locationCoordinates.has(coordinatesString)) {
				throw new Error(`Duplicate coordinates found for "${location.id}": ${coordinatesString}`);
			}
			locationCoordinates.add(coordinatesString);
		}
		return false;
	});
}
