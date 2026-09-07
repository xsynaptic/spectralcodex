import type { NavigationItem } from '#components/navigation/navigation-types.ts';

import { getTranslations } from '#lib/i18n/i18n-translations.ts';
import { getSitePath } from '#lib/utils/routing.ts';

const t = getTranslations();

export const navigationFooterItems = [
	{
		title: t('navigation.threads.label'),
		url: 'https://www.threads.com/@synapticx',
		rel: 'me',
	},
	{
		title: t('navigation.bluesky.label'),
		url: 'https://bsky.app/profile/spectralcodex.com',
		rel: 'me',
	},
	{
		title: t('navigation.facebook.label'),
		url: 'https://www.facebook.com/SpectralCodex/',
		rel: 'me',
	},
	{
		title: t('navigation.instagram.label'),
		url: 'https://www.instagram.com/spectralcodex',
		rel: 'me',
	},
	{
		title: t('navigation.mastodon.label'),
		url: 'https://indieweb.social/@SpectralCodex',
		rel: 'me',
	},
	{
		title: t('navigation.flickr.label'),
		url: 'https://www.flickr.com/photos/spectralcodex/',
		rel: 'me',
	},
	{
		title: t('navigation.patreon.label'),
		url: 'https://www.patreon.com/spectralcodex',
		rel: 'me',
	},
	{
		title: t('navigation.terms.label'),
		url: getSitePath('terms-of-use'),
	},
	{
		title: t('navigation.contact.label'),
		url: getSitePath('contact'),
	},
	{
		title: t('navigation.about.label'),
		url: getSitePath('about'),
	},
] satisfies Array<NavigationItem>;
