import { getCollection } from 'astro:content';

import { createCollectionData } from '#lib/utils/collections.ts';

/**
 * Match a given string against a match pattern (either a single string or an array of strings)
 */
export function matchLinkUrl(
	linkUrl: string,
	matchPattern: string | Array<string> | undefined,
): boolean {
	if (!matchPattern) return false;

	if (typeof matchPattern === 'string') {
		return linkUrl.includes(matchPattern);
	}

	return matchPattern.some((pattern) => linkUrl.includes(pattern));
}

export const getResourcesCollection = createCollectionData({
	collection: 'resources',
	label: 'Resources',
	async augment(entries) {
		const locations = await getCollection('locations');
		const posts = await getCollection('posts');

		for (const entry of entries) {
			const resourceId = entry.id;
			const matchPattern = entry.data.match;

			let locationCount = 0;
			let postCount = 0;

			// Count content referencing this resource
			for (const contentEntry of [...locations, ...posts]) {
				// Check URL match via links field (for website-type resources with match field)
				const hasLinkMatch =
					matchPattern &&
					contentEntry.data.links?.some((link) =>
						typeof link === 'string'
							? matchLinkUrl(link, matchPattern)
							: matchLinkUrl(link.url, matchPattern),
					);

				// Check ID match via sources field (for publication-type resources)
				const hasSourceMatch = contentEntry.data.sources?.some((source) =>
					typeof source === 'string' ? source === resourceId : false,
				);

				if (hasLinkMatch || hasSourceMatch) {
					if (contentEntry.collection === 'locations') {
						locationCount++;
					} else {
						postCount++;
					}
				}
			}

			entry.data._locationCount = locationCount;
			entry.data._postCount = postCount;
		}
	},
});
