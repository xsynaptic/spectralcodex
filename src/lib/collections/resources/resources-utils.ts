import type { CollectionEntry } from 'astro:content';

import { getCollection } from 'astro:content';

import { getResourcesCollection } from '#lib/collections/resources/resources-data.ts';

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

/**
 * Get locations associated with a resource (via links URL match or sources ID match)
 */
export async function getLocationsByResourceFunction() {
	const locations = await getCollection('locations');

	return function getLocationsByResource(
		resource: CollectionEntry<'resources'>,
	): Array<CollectionEntry<'locations'>> {
		const resourceId = resource.id;
		const matchPattern = resource.data.match;

		return locations.filter((location) => {
			// Check URL match via links field (for website-type resources with match field)
			const hasLinkMatch =
				matchPattern &&
				location.data.links?.some((link) =>
					typeof link === 'string'
						? matchLinkUrl(link, matchPattern)
						: matchLinkUrl(link.url, matchPattern),
				);

			// Check ID match via sources field (for publication-type resources)
			const hasSourceMatch = location.data.sources?.some((source) =>
				typeof source === 'string' ? source === resourceId : false,
			);

			return hasLinkMatch || hasSourceMatch;
		});
	};
}

/**
 * Get posts associated with a resource (via links URL match or sources ID match)
 */
export async function getPostsByResourceFunction() {
	const posts = await getCollection('posts');

	return function getPostsByResource(
		resource: CollectionEntry<'resources'>,
	): Array<CollectionEntry<'posts'>> {
		const resourceId = resource.id;
		const matchPattern = resource.data.match;

		return posts.filter((post) => {
			// Check URL match via links field (for website-type resources with match field)
			const hasLinkMatch =
				matchPattern &&
				post.data.links?.some((link) =>
					typeof link === 'string'
						? matchLinkUrl(link, matchPattern)
						: matchLinkUrl(link.url, matchPattern),
				);

			// Check ID match via sources field (for publication-type resources)
			const hasSourceMatch = post.data.sources?.some((source) =>
				typeof source === 'string' ? source === resourceId : false,
			);

			return hasLinkMatch || hasSourceMatch;
		});
	};
}

/**
 * Resolve links and sources
 */
export async function getResolveResourceLinksFunction() {
	const { resources } = await getResourcesCollection();

	return function resolveResourceLinks(
		entry: CollectionEntry<'locations' | 'posts' | 'regions' | 'resources' | 'themes'>,
	) {
		const entryLinks =
			'links' in entry.data && entry.data.links && entry.data.links.length > 0
				? entry.data.links
				: undefined;

		return entryLinks
			?.map((entryLink) => {
				if (typeof entryLink === 'string') {
					const resource = resources.find((resource) =>
						matchLinkUrl(entryLink, resource.data.match),
					);

					return resource ? { id: resource.id, ...resource.data } : undefined;
				}

				return entryLink;
			})
			.filter((link) => !!link);
	};
}

export async function getResolveResourceSourcesFunction() {
	const { resourcesMap } = await getResourcesCollection();

	return function resolveResourceSources(
		entry: CollectionEntry<'locations' | 'posts' | 'regions' | 'resources' | 'themes'>,
	) {
		const entrySources =
			'sources' in entry.data && entry.data.sources && entry.data.sources.length > 0
				? entry.data.sources
				: undefined;

		return entrySources
			?.map((entrySource) => {
				if (typeof entrySource === 'string') {
					const resource = resourcesMap.get(entrySource);

					return resource ? { id: resource.id, ...resource.data } : undefined;
				}

				return entrySource;
			})
			.filter((source) => !!source);
	};
}
