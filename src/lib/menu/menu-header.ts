import type { MenuItem } from '#lib/menu/menu-types.ts';

import { FEATURE_DATE_ARCHIVES } from '#constants.ts';
import { getTranslations } from '#lib/utils/i18n.ts';
import { getSiteUrl } from '#lib/utils/routing.ts';

const t = getTranslations();

export const menuHeaderItems = [
	{
		title: t('collection.posts.labelPlural'),
		url: getSiteUrl('posts'),
	},
	{
		title: t('collection.locations.labelPlural'),
		url: getSiteUrl('locations'),
	},
	{
		title: 'Taiwan',
		url: getSiteUrl('regions/taiwan'),
	},
	{
		title: t('collection.series.labelPlural'),
		url: getSiteUrl('series'),
	},
	{
		title: t('collection.themes.labelPlural'),
		url: getSiteUrl('themes'),
	},
	{
		title: t('collection.ephemera.labelPlural'),
		url: getSiteUrl('ephemera'),
	},
	...(FEATURE_DATE_ARCHIVES
		? [
				{
					title: t('menu.timeline.label'),
					url: getSiteUrl('timeline'),
				},
			]
		: []),
	{
		title: t('menu.about.label'),
		url: getSiteUrl('about'),
	},
] satisfies Array<MenuItem>;
