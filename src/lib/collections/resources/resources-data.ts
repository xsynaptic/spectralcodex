import type { CollectionEntry } from 'astro:content';

import { isLinkUrlMatch } from '@spectralcodex/shared/links';
import pMemoize from 'p-memoize';

import type { ResourceAssociation } from '#lib/collections/resources/resources-association.ts';

import { buildResourceAssociation } from '#lib/collections/resources/resources-association.ts';
import { createCollectionData, getRawCollection } from '#lib/utils/collections.ts';
import { collectUnlistedLocationIds, countContent } from '#lib/utils/content-policy.ts';

export type ResourceLink = NonNullable<ReturnType<ResolveResourceLinks>>[number];

export type ResourceSource = NonNullable<ReturnType<ResolveResourceSources>>[number];

type ResolveResourceLinks = Awaited<ReturnType<typeof createResolveResourceLinksFunction>>;

type ResolveResourceSources = Awaited<ReturnType<typeof createResolveResourceSourcesFunction>>;

// Raw reads; this runs during resources provisioning, and the match rule reads frontmatter only
export const getResourceAssociation = pMemoize(async (): Promise<ResourceAssociation> => {
	const [resources, locations, posts] = await Promise.all([
		getRawCollection('resources'),
		getRawCollection('locations'),
		getRawCollection('posts'),
	]);

	return buildResourceAssociation(resources, locations, posts);
});

export const getResourcesCollection = createCollectionData({
	collection: 'resources',
	async compute() {
		const { locationIdsByResourceId, postIdsByResourceId } = await getResourceAssociation();
		const unlistedLocationIds = collectUnlistedLocationIds(await getRawCollection('locations'));

		return function computeResource(entry: CollectionEntry<'resources'>) {
			return countContent({
				locations: locationIdsByResourceId.get(entry.id) ?? [],
				posts: postIdsByResourceId.get(entry.id) ?? [],
				unlistedLocationIds,
			});
		};
	},
	label: 'Resources',
});

export async function createResolveResourceLinksFunction() {
	const { entries } = await getResourcesCollection();

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
					const resource = entries.find((entry) => isLinkUrlMatch(entryLink, entry.data.match));

					return resource ? { id: resource.id, ...resource.data, url: entryLink } : undefined;
				}

				return entryLink;
			})
			.filter((link) => !!link);
	};
}

export async function createResolveResourceSourcesFunction() {
	const { entriesMap } = await getResourcesCollection();

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
					const resource = entriesMap.get(entrySource);

					return resource ? { id: resource.id, ...resource.data } : undefined;
				}

				return entrySource;
			})
			.filter((source) => !!source);
	};
}
