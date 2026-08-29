import type { RSSFeedItem } from '@astrojs/rss';
import type { ContainerRenderOptions } from 'astro/container';
import type { CollectionEntry } from 'astro:content';

import mdxRenderer from '@astrojs/mdx/server.js';
import { defaultSchema, sanitizeHtml } from '@xsynaptic/unified-tools';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { render } from 'astro:content';
import { performance } from 'node:perf_hooks';
import * as R from 'remeda';

import { millisecondsPerHour, siteTimezoneOffsetHours } from '#constants.ts';
import { getLocationsCollection } from '#lib/collections/locations/locations-data.ts';
import { getPostsCollection } from '#lib/collections/posts/posts-data.ts';
import { getMultilingualContent } from '#lib/i18n/i18n-utils.ts';
import { getPublicId } from '#lib/utils/collections.ts';
import { sortByDateReverseChronological } from '#lib/utils/date.ts';
import { getDescriptionRenderedText } from '#lib/utils/description.ts';
import { getContentUrl } from '#lib/utils/routing.ts';
import { stripFootnotes } from '#lib/utils/text.ts';

/**
 * Use Astro's Container API to render MDX content
 * TODO: because there is only one container all rendering is serial; can we run multiple containers in parallel?
 * @link https://docs.astro.build/en/reference/container-reference/
 */
async function createRenderMdxFunction() {
	const container = await AstroContainer.create();

	container.addServerRenderer({ name: 'mdx', renderer: mdxRenderer });

	return async function (
		entry: CollectionEntry<'locations' | 'pages' | 'posts'>,
		options?: ContainerRenderOptions,
	) {
		const { Content } = await render(entry);

		return await container.renderToString(Content, options);
	};
}

const renderMdx = await createRenderMdxFunction();

const feedSanitizeSchema = {
	...defaultSchema,
	// Feed readers ship no stylesheet, so CJK wrapper spans unwrap to plain text
	tagNames: [...(defaultSchema.tagNames ?? []), 'figure', 'figcaption'].filter(
		(tagName) => tagName !== 'span',
	),
};

function sanitizeFeedContent(contentHtml: string, shouldExcludeFootnotes: boolean) {
	return sanitizeHtml(
		shouldExcludeFootnotes ? stripFootnotes(contentHtml) : contentHtml,
		feedSanitizeSchema,
	);
}

const generateFeedItem = async ({
	entry,
	shouldExcludeFootnotes,
	debug,
}: {
	entry: CollectionEntry<'locations' | 'posts'>;
	shouldExcludeFootnotes: boolean;
	debug: boolean;
}) => {
	const startTime = performance.now();

	const titleMultilingual = getMultilingualContent({ data: entry.data, prop: 'title' })?.primary;

	const contentHtml = await renderMdx(entry, {
		locals: {
			isFeed: true, // This conditional controls the output of MDX components
		},
	});

	const contentSanitized = sanitizeFeedContent(contentHtml, shouldExcludeFootnotes);

	const description = await getDescriptionRenderedText(entry);

	const pubDate = entry.data.dateUpdated ?? entry.data.dateCreated;

	const feedItem = {
		title: titleMultilingual
			? `${entry.data.title} (${titleMultilingual.value})`
			: entry.data.title,
		link: getContentUrl(entry.collection, getPublicId(entry)),
		// Dates sit at 00:00 UTC; re-anchor to the site timezone so today's entries are never future-dated
		pubDate: new Date(pubDate.getTime() - siteTimezoneOffsetHours * millisecondsPerHour),
		...(description ? { description } : {}),
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
	shouldExcludeFootnotes,
	debug,
}: {
	itemCount: number;
	shouldExcludeFootnotes: boolean;
	debug: boolean;
}) {
	const { entries: locations } = await getLocationsCollection();
	const { entries: posts } = await getPostsCollection();

	return R.pipe(
		await R.pipe(
			[
				...posts.filter((entry) => entry.data.entryQuality >= 3),
				...locations.filter((entry) => entry.data.entryQuality >= 3),
			],
			R.sort(sortByDateReverseChronological),
			R.take(itemCount),
			(items) =>
				Promise.all(
					items.map((item) => generateFeedItem({ entry: item, shouldExcludeFootnotes, debug })),
				),
		),
		R.sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime()),
		R.take(itemCount),
	);
}
