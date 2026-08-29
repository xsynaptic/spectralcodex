import type { APIContext } from 'astro';

import rss from '@astrojs/rss';
import { performance } from 'node:perf_hooks';

import { siteYearFounded } from '#constants.ts';
import { getTranslations } from '#lib/i18n/i18n-translations.ts';
import { getSiteUrl } from '#lib/utils/routing.ts';
import { generateFeedItems } from '#lib/utils/rss.ts';
import { formatStringTemplate } from '#lib/utils/text.ts';

// Provide some helpful info while debugging feed generation
const isFeedDebug = false as boolean;

// Should footnotes be excluded from feed content?
const isFeedExcludeFootnotes = true as boolean;

// How many items should be included in the feed?
const feedItemCount = 20;

export async function GET(context: APIContext): Promise<Response> {
	const startTime = performance.now();

	if (isFeedDebug) console.log(`[RSS] Initializing feed...`);

	const items = await generateFeedItems({
		itemCount: feedItemCount,
		shouldExcludeFootnotes: isFeedExcludeFootnotes,
		debug: isFeedDebug,
	});

	const t = getTranslations();

	// Channel freshness tracks the newest item, not build time, so unchanged content keeps its ETag
	const lastBuildDate = items[0]?.pubDate;

	const copyright = `${formatStringTemplate(t('site.footer.copyright.label'), {
		year: siteYearFounded,
		currentYear: new Date().getFullYear(),
	})} ${t('site.title')}`;

	const rssFeed = rss({
		xmlns: { atom: 'http://www.w3.org/2005/Atom' },
		customData: [
			'<language>en-us</language>',
			`<atom:link href="${getSiteUrl()}rss.xml" rel="self" type="application/rss+xml"/>`,
			...(lastBuildDate ? [`<lastBuildDate>${lastBuildDate.toUTCString()}</lastBuildDate>`] : []),
			`<copyright>${copyright}</copyright>`,
		].join(''),
		title: t('site.title'),
		description: t('site.description'),
		site: context.site ?? '',
		items,
	});

	if (isFeedDebug) {
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
