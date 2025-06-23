import type { CollectionKey } from 'astro:content';

import type { MultilingualContent } from '#lib/i18n/i18n-types.ts';

// This is a subset of common properties of different content collections
export interface ContentMetadataItem<T extends CollectionKey = CollectionKey> {
	collection: T;
	id: string;
	title: string;
	titleMultilingual: MultilingualContent | undefined;
	description?: string | undefined;
	date: Date;
	url: string;
	imageId: string | undefined;
	regionPrimaryId: string | undefined;
	postCount: number | undefined;
	locationCount: number | undefined;
	wordCount: number | undefined;
	backlinks: Set<string>;
	entryQuality: number;
}
