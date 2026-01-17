import type { CollectionKey } from 'astro:content';

import type { MultilingualContent } from '#lib/i18n/i18n-types.ts';

/**
 * Metadata
 */
export type ContentMetadataCollectionKey = Exclude<CollectionKey, 'images' | 'timeline'>;

// This is a subset of common properties of different content collections
export interface ContentMetadataItem<
	T extends ContentMetadataCollectionKey = ContentMetadataCollectionKey,
> {
	collection: T;
	id: string;
	title: string;
	titleMultilingual: MultilingualContent | undefined;
	description?: string | undefined;
	url: string;
	imageId: string | undefined;
	regionPrimaryId: string | undefined;
	postCount: number | undefined;
	locationCount: number | undefined;
	linksCount: number | undefined;
	wordCount: number | undefined;
	backlinks: Set<string>;
	dateCreated: Date;
	dateUpdated: Date | undefined;
	dateVisited: Array<Date> | undefined;
	entryQuality: number;
}
