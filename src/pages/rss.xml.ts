import type { APIContext } from 'astro';

import rss from '@astrojs/rss';
import { performance } from 'node:perf_hooks';

import { getTranslations } from '#lib/i18n/i18n-translations.ts';
import { generateFeedItems } from '#lib/utils/rss.ts';

// Provide some helpful info while debugging feed generation
const FEED_DEBUG = false as boolean;

// Should footnotes be excluded from feed content?
const FEED_EXCLUDE_FOOTNOTES = true as boolean;

// How many items should be included in the feed?
const FEED_ITEM_COUNT = 20;

/**
 * @link https://docs.astro.build/en/guides/rss/
 */
export async function GET(context: APIContext): Promise<Response> {
	const startTime = performance.now();

	if (FEED_DEBUG) console.log(`[RSS] Initializing feed...`);

	const items = await generateFeedItems({
		itemCount: FEED_ITEM_COUNT,
		excludeFootnotes: FEED_EXCLUDE_FOOTNOTES,
		debug: FEED_DEBUG,
	});

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
