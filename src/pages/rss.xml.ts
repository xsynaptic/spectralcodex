import type { APIRoute } from 'astro';

import { getRssResponse } from '@xsynaptic/astro-syndication/rss';
import { performance } from 'node:perf_hooks';

import { siteYearFounded } from '#constants.ts';
import { getTranslations } from '#lib/i18n/i18n-translations.ts';
import { getSyndicationItems } from '#lib/syndication/syndication-data.ts';
import { getAbsoluteUrl, getBasePath } from '#lib/utils/routing.ts';
import { formatStringTemplate } from '#lib/utils/text.ts';

// Provide some helpful info while debugging feed generation
const isFeedDebug = false as boolean;

// Should footnotes be excluded from feed content?
const isFeedExcludeFootnotes = true as boolean;

// How many items should be included in the feed?
const feedItemCount = 20;

export const GET = (async (context) => {
	const startTime = performance.now();

	if (isFeedDebug) console.log(`[RSS] Initializing feed...`);

	const items = await getSyndicationItems({
		itemCount: feedItemCount,
		shouldExcludeFootnotes: isFeedExcludeFootnotes,
	});

	const t = getTranslations();

	const copyright = `${formatStringTemplate(t('site.footer.copyright.label'), {
		currentYear: new Date().getFullYear(),
		year: siteYearFounded,
	})} ${t('site.title')}`;

	const rssFeed = await getRssResponse({
		items,
		publication: {
			copyright,
			description: t('site.description'),
			language: 'en-us',
			site: context.site,
			title: t('site.title'),
		},
		selfUrl: getAbsoluteUrl(getBasePath('rss.xml')),
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
}) satisfies APIRoute;
