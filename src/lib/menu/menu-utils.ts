import slugify from '@sindresorhus/slugify';

import type { MenuItem } from '#lib/menu/menu-types.ts';

export function isActiveMenuItem(item: MenuItem, pathname: string): boolean {
	if (item.url === pathname || item.url === pathname.replace(/\/$/, '')) return true;

	return item.children?.some((child) => isActiveMenuItem(child, pathname)) ?? false;
}

export function getMenuItemId(item: MenuItem) {
	return `menu-${slugify(item.title)}`;
}
