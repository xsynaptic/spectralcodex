import slugify from '@sindresorhus/slugify';

import type { MenuItem } from '#lib/menu/menu-types.ts';

import { getTranslations } from '#lib/i18n/i18n-translations.ts';

export function isActiveMenuItem(item: MenuItem, pathname: string): boolean {
	if (item.url === pathname || item.url === pathname.replace(/\/$/, '')) return true;

	return item.children?.some((child) => isActiveMenuItem(child, pathname)) ?? false;
}

export function getMenuItemId(item: MenuItem) {
	return `menu-${slugify(item.title)}`;
}

export function getMenuItemAriaLabel(item: MenuItem) {
	const t = getTranslations();

	return t('site.menu.header.submenu.label').replaceAll('%s', item.title);
}
