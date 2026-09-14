import type { CollectionKey } from 'astro:content';

import type { MultilingualContent } from '#lib/i18n/i18n-types.ts';

export interface NavigationItem {
	ancestor?: string | undefined;
	children?: Array<NavigationItem>;
	collection?: CollectionKey | undefined;
	rel?: string | undefined;
	title: string;
	titleMultilingual?: MultilingualContent | undefined;
	url?: string | undefined;
}
