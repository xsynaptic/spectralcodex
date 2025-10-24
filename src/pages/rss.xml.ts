import type { RSSFeedItem } from '@astrojs/rss';
import type { APIContext } from 'astro';
import type { CollectionEntry } from 'astro:content';

import rss from '@astrojs/rss';
import {
	defaultSchema,
	sanitizeHtml,
	stripFootnotes,
	stripTags,
	transformMarkdown,
} from '@spectralcodex/unified-tools';
import { performance } from 'node:perf_hooks';
import * as R from 'remeda';

import { getEphemeraCollection } from '#lib/collections/ephemera/data.ts';
import { getLocationsCollection } from '#lib/collections/locations/data.ts';
import { getPostsCollection } from '#lib/collections/posts/data.ts';
import { getTranslations } from '#lib/i18n/i18n-translations.ts';
import { getPrimaryMultilingualContent } from '#lib/i18n/i18n-utils.ts';
import { getRenderMdxFunction } from '#lib/utils/astro.ts';
import { getFilterEntryQualityFunction } from '#lib/utils/collections.ts';
import { parseContentDate, sortByDateReverseChronological } from '#lib/utils/date.ts';
import { getContentUrl } from '#lib/utils/routing.ts';

// Provide some helpful info while debugging feed generation
const FEED_DEBUG = false as boolean;

// Should footnotes be excluded from feed content?
const FEED_EXCLUDE_FOOTNOTES = true as boolean;

// How many items should be included in the feed?
const FEED_ITEM_COUNT = 20;

const renderMdx = await getRenderMdxFunction();

const generateFeedItem = async (entry: CollectionEntry<'ephemera' | 'locations' | 'posts'>) => {
	const startTime = performance.now();

	const titleMultilingual = getPrimaryMultilingualContent(entry.data, 'title');

	const contentHtml = await renderMdx(entry, {
		locals: {
			isFeed: true, // This conditional controls the output of MDX components
		},
	});

	const contentSanitized = sanitizeHtml(
		FEED_EXCLUDE_FOOTNOTES ? stripFootnotes(contentHtml) : contentHtml,
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

	if (FEED_DEBUG) {
		console.log(
			`[RSS] Generated entry for "${entry.data.title}" in ${(performance.now() - startTime).toFixed(5)}ms`,
		);
	}

	return feedItem;
};

async function generateFeedItems() {
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
			R.take(FEED_ITEM_COUNT),
			(items) => Promise.all(items.map(generateFeedItem)),
		),
		R.sort((a, b) => (a.pubDate && b.pubDate ? b.pubDate.getTime() - a.pubDate.getTime() : -1)),
		R.take(FEED_ITEM_COUNT),
	);
}

/**
 * @link https://docs.astro.build/en/guides/rss/
 */
export async function GET(context: APIContext): Promise<Response> {
	const startTime = performance.now();

	if (FEED_DEBUG) console.log(`[RSS] Initializing feed...`);

	const items = await generateFeedItems();

	const t = getTranslations();

	const rssFeed = rss({
		customData: '<language>en-us</language>',
		title: t('site.title'),
		description: t('site.description'),
		site: context.site ?? '',
		items,
	});

	if (FEED_DEBUG) {
		console.log(`[RSS] Generated in ${(performance.now() - startTime).toFixed(5)}ms`);

		if (items.length > 0) {
			console.log(`[RSS] Feed contains ${String(items.length)} items:`);
			for (const item of items) {
				console.log(`- ${item.title}`);
			}
		}
	}

	return rssFeed;
}
