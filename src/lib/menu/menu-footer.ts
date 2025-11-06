import type { MenuItem } from '#lib/types/index.ts';

import { getTranslations } from '#lib/i18n/i18n-translations.ts';
import { getSiteUrl } from '#lib/utils/routing.ts';

const t = getTranslations();

export const menuFooterItems = [
	{
		title: t('menu.bluesky.label'),
		url: 'https://bsky.app/profile/spectralcodex.com',
	},
	{
		title: t('menu.facebook.label'),
		url: 'https://www.facebook.com/SpectralCodex/',
	},
	{
		title: t('menu.instagram.label'),
		url: 'https://www.instagram.com/spectralcodex',
	},
	{
		title: t('menu.mastodon.label'),
		url: 'https://indieweb.social/@SpectralCodex',
	},
	{
		title: t('menu.flickr.label'),
		url: 'https://www.flickr.com/photos/spectralcodex/',
	},
	{
		title: t('menu.patreon.label'),
		url: 'https://www.patreon.com/spectralcodex',
	},
	{
		title: t('menu.terms.label'),
		url: getSiteUrl('terms-of-use'),
	},
	{
		title: t('menu.contact.label'),
		url: getSiteUrl('contact'),
	},
	{
		title: t('menu.about.label'),
		url: getSiteUrl('about'),
	},
] satisfies Array<MenuItem>;
