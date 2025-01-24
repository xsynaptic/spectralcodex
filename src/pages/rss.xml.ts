import mdxRenderer from '@astrojs/mdx/server.js';
import rss from '@astrojs/rss';
import {
	defaultSchema,
	sanitizeHtml,
	stripTags,
	transformMarkdown,
} from '@xsynaptic/unified-tools';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { render } from 'astro:content';
import { performance } from 'node:perf_hooks';
import * as R from 'remeda';

import type { RSSFeedItem } from '@astrojs/rss';
import type { APIContext } from 'astro';
import type { CollectionEntry } from 'astro:content';

import { getEphemeraCollection } from '@/lib/collections/ephemera/data';
import { getLocationsCollection } from '@/lib/collections/locations/data';
import { getPostsCollection } from '@/lib/collections/posts/data';
import { getFilterEntryQualityFunction } from '@/lib/utils/collections';
import { parseContentDate, sortByDateReverseChronological } from '@/lib/utils/date';
import { getTranslations } from '@/lib/utils/i18n';
import { getContentUrl } from '@/lib/utils/routing';

// Provide some helpful info while debugging RSS feed generation
const DEBUG_RSS_FEED = true as boolean;

const container = await AstroContainer.create();

container.addServerRenderer({ name: 'mdx', renderer: mdxRenderer });

const getRssItem = async (
	item: CollectionEntry<'ephemera' | 'posts'> | CollectionEntry<'locations'>,
) => {
	const startTime = performance.now();

	const {
		data: { title, titleAlt, description, dateCreated, dateUpdated },
	} = item;

	// These are expensive operations; everything below content rendering is not
	const { Content } = await render(item);
	const postHtml = await container.renderToString(Content, {
		locals: {
			isRss: true, // This conditional controls the output of MDX components
		},
	});

	const contentSanitized = sanitizeHtml(postHtml, {
		...defaultSchema,
		tagNames: [...(defaultSchema.tagNames ?? []), 'figure', 'figcaption'],
	});

	const rssFeedItem = {
		title: titleAlt ? `${title} (${titleAlt})` : title,
		link: getContentUrl(item.collection, item.id),
		pubDate: parseContentDate(dateUpdated ?? dateCreated),
		...(description ? { description: stripTags(transformMarkdown(description)) } : {}),
		...(contentSanitized ? { content: contentSanitized } : {}),
	} satisfies RSSFeedItem;

	if (DEBUG_RSS_FEED) {
		console.log(
			`[RSS] Generated entry for "${title}" in ${Number(performance.now() - startTime).toFixed(5)}ms`,
		);
	}

	return rssFeedItem;
};

/**
 * @link https://docs.astro.build/en/guides/rss/
 */
export async function GET(context: APIContext): Promise<Response> {
	const startTime = performance.now();

	if (DEBUG_RSS_FEED) console.log(`[RSS] Initializing feed...`);

	const { ephemera } = await getEphemeraCollection();
	const { locations } = await getLocationsCollection();
	const { posts } = await getPostsCollection();

	const t = getTranslations();

	const items = R.pipe(
		await R.pipe(
			[
				...R.pipe(ephemera, R.filter(getFilterEntryQualityFunction(3))),
				...R.pipe(posts, R.filter(getFilterEntryQualityFunction(3))),
				...R.pipe(locations, R.filter(getFilterEntryQualityFunction(3))),
			],
			R.sort(sortByDateReverseChronological),
			R.take(20),
			(items) => Promise.all(items.map((item) => getRssItem(item))),
		),
		R.sort((a, b) => (a.pubDate && b.pubDate ? b.pubDate.getTime() - a.pubDate.getTime() : -1)),
		R.take(20),
	);

	const rssFeed = rss({
		customData: '<language>en-us</language>',
		title: t('site.title'),
		description: t('site.description'),
		site: context.site ?? '',
		items,
	});

	if (DEBUG_RSS_FEED) {
		console.log(`[RSS] Generated in ${Number(performance.now() - startTime).toFixed(5)}ms`);

		if (items.length > 0) {
			console.log(`[RSS] Feed contains ${String(items.length)} items:`);
			for (const item of items) {
				console.log(`- ${item.title}`);
			}
		}
	}

	return rssFeed;
}
