import type { CollectionEntry } from 'astro:content';

import * as R from 'remeda';

import type { Thing } from '#lib/utils/seo-structured-data.ts';

import { getNotesCollection } from '#lib/collections/notes/notes-data.ts';
import { sortByDateReverseChronological } from '#lib/utils/date.ts';
import { getDescriptionRenderedText } from '#lib/utils/description.ts';
import { buildArticleSchema, buildAuthorSchema } from '#lib/utils/seo-structured-data.ts';

export async function getNoteSchema(
	entry: CollectionEntry<'notes'>,
	props: { url: string; imageUrl: string | undefined },
): Promise<Array<Thing>> {
	return [
		buildArticleSchema({
			title: entry.data.title,
			description: await getDescriptionRenderedText(entry),
			dateCreated: entry.data.dateCreated,
			dateUpdated: entry.data.dateUpdated,
			url: props.url,
			imageUrl: props.imageUrl,
		}),
		buildAuthorSchema(),
	];
}

export async function queryNotesIndex() {
	const { entries } = await getNotesCollection();

	return R.pipe(
		entries,
		R.filter((entry) => entry.data.entryQuality >= 2),
		R.sort(sortByDateReverseChronological),
	);
}
