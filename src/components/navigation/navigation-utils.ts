import type { NavigationItem } from '#components/navigation/navigation-types.ts';

import { getTranslations } from '#lib/i18n/i18n-translations.ts';
import { formatStringTemplate } from '#lib/utils/text.ts';

// Exact match only; aria-current="page" must not land on an ancestor of the current page
export function isCurrentNavigationItem(item: NavigationItem, pathname: string): boolean {
	return item.url === pathname || item.url === pathname.replace(/\/$/, '');
}

export function isActiveNavigationItem(item: NavigationItem, pathname: string): boolean {
	if (isCurrentNavigationItem(item, pathname)) return true;

	return item.children?.some((child) => isActiveNavigationItem(child, pathname)) ?? false;
}

export function getNavigationItemAriaLabel(item: NavigationItem) {
	const t = getTranslations();

	return formatStringTemplate(t('site.navigation.header.submenu.label'), { title: item.title });
}

// Anchors are navigable, buttons open a submenu, spans are plain labels
export function getNavigationItemTriggerType(item: NavigationItem) {
	if (item.url) return 'anchor';
	if (item.children?.length) return 'button';

	return 'span';
}

const multilingualRegions = new Set(['taiwan', 'hong-kong']);

export function shouldShowNavigationItemMultilingual(item: NavigationItem, depth: number): boolean {
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
