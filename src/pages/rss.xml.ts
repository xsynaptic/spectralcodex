import type { RSSFeedItem } from '@astrojs/rss';
import type { APIContext } from 'astro';
import type { CollectionEntry } from 'astro:content';

import rss from '@astrojs/rss';
import {
	defaultSchema,
	sanitizeHtml,
	stripTags,
	transformMarkdown,
} from '@spectralcodex/unified-tools';
import { performance } from 'node:perf_hooks';
import * as R from 'remeda';

import { getEphemeraCollection } from '#lib/collections/ephemera/data.ts';
import { getLocationsCollection } from '#lib/collections/locations/data.ts';
import { getPostsCollection } from '#lib/collections/posts/data.ts';
import { getTranslations } from '#lib/i18n/i18n-translations.ts';
import { getMultilingualContent } from '#lib/i18n/i18n-utils.ts';
import { getFilterEntryQualityFunction } from '#lib/utils/collections.ts';
import { parseContentDate, sortByDateReverseChronological } from '#lib/utils/date.ts';
import { getRenderMdxFunction } from '#lib/utils/mdx.ts';
import { getContentUrl } from '#lib/utils/routing.ts';

// Provide some helpful info while debugging RSS feed generation
const RSS_FEED_DEBUG = false as boolean;

// How many items should be included in the RSS feed?
const RSS_FEED_ITEM_COUNT = 20;

const renderMdx = await getRenderMdxFunction();

const getRssItem = async (
	entry: CollectionEntry<'ephemera' | 'posts'> | CollectionEntry<'locations'>,
) => {
	const startTime = performance.now();

	const titleMultilingual = getMultilingualContent(entry.data, 'title');

	const postHtml = await renderMdx(entry, {
		locals: {
			isRss: true, // This conditional controls the output of MDX components
		},
	});

	const contentSanitized = sanitizeHtml(postHtml, {
		...defaultSchema,
		tagNames: [...(defaultSchema.tagNames ?? []), 'figure', 'figcaption'],
	});

	const rssFeedItem = {
		title: titleMultilingual
			? `${entry.data.title} (${titleMultilingual.value})`
			: entry.data.title,
		link: getContentUrl(entry.collection, entry.id),
		pubDate: parseContentDate(entry.data.dateUpdated ?? entry.data.dateCreated),
		...(entry.data.description
			? { description: stripTags(transformMarkdown({ input: entry.data.description })) }
			: {}),
		...(entry.data.imageFeatured ? { image: entry.data.imageFeatured } : {}),
		...(contentSanitized ? { content: contentSanitized } : {}),
	} satisfies RSSFeedItem;

	if (RSS_FEED_DEBUG) {
		console.log(
			`[RSS] Generated entry for "${entry.data.title}" in ${(performance.now() - startTime).toFixed(5)}ms`,
		);
	}

	return rssFeedItem;
};

/**
 * @link https://docs.astro.build/en/guides/rss/
 */
export async function GET(context: APIContext): Promise<Response> {
	const startTime = performance.now();

	if (RSS_FEED_DEBUG) console.log(`[RSS] Initializing feed...`);

	const { ephemera } = await getEphemeraCollection();
	const { locations } = await getLocationsCollection();
	const { posts } = await getPostsCollection();

	const filterEntryQuality = getFilterEntryQualityFunction(3);

	const t = getTranslations();

	const items = R.pipe(
		await R.pipe(
			[
				...ephemera.filter(filterEntryQuality),
				...posts.filter(filterEntryQuality),
				...locations.filter(filterEntryQuality),
			],
			R.sort(sortByDateReverseChronological),
			R.take(RSS_FEED_ITEM_COUNT),
			(items) => Promise.all(items.map(getRssItem)),
		),
		R.sort((a, b) => (a.pubDate && b.pubDate ? b.pubDate.getTime() - a.pubDate.getTime() : -1)),
		R.take(RSS_FEED_ITEM_COUNT),
	);

	const rssFeed = rss({
		customData: '<language>en-us</language>',
		title: t('site.title'),
		description: t('site.description'),
		site: context.site ?? '',
		items,
	});

	if (RSS_FEED_DEBUG) {
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
