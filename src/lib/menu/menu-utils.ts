import type { MenuItem } from '#lib/menu/menu-types.ts';

export function isActiveMenuItem(item: MenuItem, pathname: string): boolean {
	if (item.url === pathname || item.url === pathname.replace(/\/$/, '')) return true;

	return item.children?.some((child) => isActiveMenuItem(child, pathname)) ?? false;
}

export function getMenuItemId(item: MenuItem): string {
	return `menu-${item.url.replaceAll(/[^a-z0-9]/gi, '-')}`;
}
