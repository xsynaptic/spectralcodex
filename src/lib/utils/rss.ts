import type { RSSFeedItem } from '@astrojs/rss';
import type { CollectionEntry } from 'astro:content';

import {
	defaultSchema,
	sanitizeHtml,
	stripTags,
	transformMarkdown,
} from '@xsynaptic/unified-tools';
import { performance } from 'node:perf_hooks';
import * as R from 'remeda';

import { getEphemeraCollection } from '#lib/collections/ephemera/ephemera-data.ts';
import { getLocationsCollection } from '#lib/collections/locations/locations-data.ts';
import { getPostsCollection } from '#lib/collections/posts/posts-data.ts';
import { getPrimaryMultilingualContent } from '#lib/i18n/i18n-utils.ts';
import { getRenderMdxFunction } from '#lib/utils/astro.ts';
import { getFilterEntryQualityFunction } from '#lib/utils/collections.ts';
import { parseContentDate, sortByDateReverseChronological } from '#lib/utils/date.ts';
import { getContentUrl } from '#lib/utils/routing.ts';

/**
 * Strips GFM-style footnotes from HTML content using a simple regex approach
 */
function stripFootnotes(input: string): string {
	// Remove footnote references (`sup` elements with footnote links)
	let result = input.replaceAll(/<sup><a[^>]*data-footnote-ref[^>]*>.*?<\/a><\/sup>/gi, '');

	// Remove the entire footnotes section
	result = result.replaceAll(/<section[^>]*data-footnotes[^>]*>.*?<\/section>/gis, '');

	return result;
}

const renderMdx = await getRenderMdxFunction();

const generateFeedItem = async ({
	entry,
	excludeFootnotes,
	debug,
}: {
	entry: CollectionEntry<'ephemera' | 'locations' | 'posts'>;
	excludeFootnotes: boolean;
	debug: boolean;
}) => {
	const startTime = performance.now();

	const titleMultilingual = getPrimaryMultilingualContent(entry.data, 'title');

	const contentHtml = await renderMdx(entry, {
		locals: {
			isFeed: true, // This conditional controls the output of MDX components
		},
	});

	const contentSanitized = sanitizeHtml(
		excludeFootnotes ? stripFootnotes(contentHtml) : contentHtml,
		{
			...defaultSchema,
			tagNames: [...(defaultSchema.tagNames ?? []), 'figure', 'figcaption'],
		},
	);

	const feedItem = {
		title: titleMultilingual
			? `${entry.data.title} (${titleMultilingual.value})`
			: entry.data.title,
		link: getContentUrl(entry.collection, entry.id),
		pubDate: parseContentDate(entry.data.dateUpdated ?? entry.data.dateCreated),
		...(entry.data.description
			? { description: stripTags(transformMarkdown({ input: entry.data.description })) }
			: {}),
		...(contentSanitized ? { content: contentSanitized } : {}),
	} satisfies RSSFeedItem;

	if (debug) {
		console.log(
			`[RSS] Generated entry for "${entry.data.title}" in ${(performance.now() - startTime).toFixed(5)}ms`,
		);
	}

	return feedItem;
};

export async function generateFeedItems({
	itemCount,
	excludeFootnotes,
	debug,
}: {
	itemCount: number;
	excludeFootnotes: boolean;
	debug: boolean;
}) {
	const { ephemera } = await getEphemeraCollection();
	const { locations } = await getLocationsCollection();
	const { posts } = await getPostsCollection();

	const filterEntryQuality = getFilterEntryQualityFunction(3);

	return R.pipe(
		await R.pipe(
			[
				...ephemera.filter(filterEntryQuality),
				...posts.filter(filterEntryQuality),
				...locations.filter(filterEntryQuality),
			],
			R.sort(sortByDateReverseChronological),
			R.take(itemCount),
			(items) =>
				Promise.all(
					items.map((item) => generateFeedItem({ entry: item, excludeFootnotes, debug })),
				),
		),
		R.sort((a, b) => (a.pubDate && b.pubDate ? b.pubDate.getTime() - a.pubDate.getTime() : -1)),
		R.take(itemCount),
	);
}
