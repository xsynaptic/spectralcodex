import type { CollectionEntry } from 'astro:content';

import type { Thing } from '#lib/utils/seo-structured-data.ts';

import { getDescriptionRenderedText } from '#lib/utils/description-data.ts';
import {
	buildArticleSchema,
	buildAuthorSchema,
	buildEntryBreadcrumbSchema,
} from '#lib/utils/seo-structured-data.ts';

export function getPostStructuredData(
	entry: CollectionEntry<'posts'>,
	props: { imageUrl: string | undefined; url: string },
): Array<Thing> {
	return [
		buildEntryBreadcrumbSchema({
			collection: 'posts',
			title: entry.data.title,
			url: props.url,
		}),
		buildArticleSchema({
			dateCreated: entry.data.dateCreated,
			dateUpdated: entry.data.dateUpdated,
			description: getDescriptionRenderedText(entry),
			imageUrl: props.imageUrl,
			title: entry.data.title,
			url: props.url,
		}),
		buildAuthorSchema(),
	];
}
