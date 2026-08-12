import { createCollectionData, getRawCollection } from '#lib/utils/collections.ts';

// Match a given string against a match pattern (either a single string or an array of strings)
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
	async mutate(entries) {
		const locations = await getRawCollection('locations');
		const posts = await getRawCollection('posts');
		const notes = await getRawCollection('notes');

		for (const entry of entries) {
			const resourceId = entry.id;
			const matchPattern = entry.data.match;

			let locationCount = 0;
			let postCount = 0;
			let noteCount = 0;

			// Count content referencing this resource
			for (const contentEntry of [...locations, ...posts, ...notes]) {
				// Check URL match via links field (for website-type resources with match field)
				const hasLinkMatch =
					matchPattern &&
					contentEntry.data.links?.some((link) =>
						matchLinkUrl(typeof link === 'string' ? link : link.url, matchPattern),
					);

				// Check ID match via sources field (for publication-type resources)
				const hasSourceMatch = contentEntry.data.sources?.some((source) =>
					typeof source === 'string' ? source === resourceId : false,
				);

				if (hasLinkMatch || hasSourceMatch) {
					if (contentEntry.collection === 'locations') {
						locationCount++;
					} else if (contentEntry.collection === 'notes') {
						noteCount++;
					} else {
						postCount++;
					}
				}
			}

			entry.data._locationCount = locationCount;
			entry.data._postCount = postCount;
			entry.data._noteCount = noteCount;
			entry.data._entryCount = locationCount + postCount + noteCount;
		}
	},
});
