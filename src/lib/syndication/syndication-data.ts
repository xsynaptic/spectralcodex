import type { SyndicationPublication } from '@xsynaptic/astro-syndication';

import * as R from 'remeda';

import { siteYearFounded, syndicationItemCount } from '#constants.ts';
import { getLocationsCollection } from '#lib/collections/locations/locations-data.ts';
import { getPostsCollection } from '#lib/collections/posts/posts-data.ts';
import { getTranslations } from '#lib/i18n/i18n-translations.ts';
import { createSyndicationItemFunction } from '#lib/syndication/syndication-item.ts';
import { isFeaturedQuality, isListed } from '#lib/utils/content-policy.ts';
import { sortByDateReverseChronological } from '#lib/utils/date.ts';
import { formatStringTemplate } from '#lib/utils/text.ts';

export async function getSyndicationItems() {
	const getSyndicationItem = await createSyndicationItemFunction();

	const { entries: locations } = await getLocationsCollection();
	const { entries: posts } = await getPostsCollection();

	const entries = R.pipe(
		[
			...posts.filter((entry) => isFeaturedQuality(entry.data)),
			...locations.filter((entry) => isListed(entry.data) && isFeaturedQuality(entry.data)),
		],
		R.sort(sortByDateReverseChronological),
		R.take(syndicationItemCount),
	);

	return Promise.all(entries.map((entry) => getSyndicationItem(entry)));
}

export function getSyndicationPublication(site: SyndicationPublication['site']) {
	const t = getTranslations();

	const copyright = `${formatStringTemplate(t('site.footer.copyright.label'), {
		currentYear: new Date().getFullYear(),
		year: siteYearFounded,
	})} ${t('site.title')}`;

	return {
		copyright,
		description: t('site.description'),
		language: 'en-us',
		site,
		title: t('site.title'),
	} satisfies SyndicationPublication;
}
