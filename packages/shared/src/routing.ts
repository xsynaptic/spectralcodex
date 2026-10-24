import { ContentCollectionsEnum } from '#collections.ts';

export const siteBasePath = '/';

const rootCollections = new Set<string>([
	ContentCollectionsEnum.Locations,
	ContentCollectionsEnum.Pages,
	ContentCollectionsEnum.Posts,
]);

// Drop-in replacement for the url-join package
export function joinUrl(...parts: Array<string>): string {
	return parts.join('/').replaceAll(/(?<!:)\/\/+/g, '/');
}

export function getCollectionSegment(collection: string): string {
	return rootCollections.has(collection) ? '' : collection;
}
