import type { CollectionKey } from 'astro:content';

import type { MultilingualContent } from '#lib/i18n/i18n-types.ts';

/**
 * Menu
 */
export interface MenuItem {
	collection?: CollectionKey | undefined;
	title: string;
	titleMultilingual?: MultilingualContent | undefined;
	url: string;
	rel?: string | undefined;
	ancestor?: string | undefined;
	children?: Array<MenuItem>;
}
