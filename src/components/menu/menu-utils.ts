import type { MenuItem } from '#components/menu/menu-types.ts';

import { getTranslations } from '#lib/i18n/i18n-translations.ts';
import { formatStringTemplate } from '#lib/utils/text.ts';

export function isActiveMenuItem(item: MenuItem, pathname: string): boolean {
	if (item.url === pathname || item.url === pathname.replace(/\/$/, '')) return true;

	return item.children?.some((child) => isActiveMenuItem(child, pathname)) ?? false;
}

export function getMenuItemAriaLabel(item: MenuItem) {
	const t = getTranslations();

	return formatStringTemplate(t('site.menu.header.submenu.label'), { title: item.title });
}

// Anchors are navigable, buttons open a submenu, spans are plain labels
export function getMenuItemTriggerType(item: MenuItem) {
	if (item.url) return 'anchor';
	if (item.children?.length) return 'button';

	return 'span';
}

const multilingualRegions = new Set(['taiwan', 'hong-kong']);

export function shouldShowMenuItemMultilingual(item: MenuItem, depth: number): boolean {
	if (!item.titleMultilingual) return false;

	switch (item.collection) {
		case 'regions': {
			return depth > 1 && multilingualRegions.has(item.ancestor ?? '');
		}
		case 'series':
		case 'themes': {
			return true;
		}
		default: {
			return false;
		}
	}
}
