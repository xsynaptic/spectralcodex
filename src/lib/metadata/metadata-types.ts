import type { ImageFeaturedObject } from '@spectralcodex/shared/schemas';
import type { CollectionKey } from 'astro:content';

import type { MultilingualContent } from '#lib/i18n/i18n-types.ts';

/**
 * Metadata
 */
export type ContentMetadataCollectionKey = Extract<
	CollectionKey,
	'ephemera' | 'locations' | 'pages' | 'posts' | 'regions' | 'series' | 'themes'
>;

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

// Image featured data is sometimes displayed with a caption
export type ImageFeaturedCaptionMetadata = Pick<
	ContentMetadataItem,
	'id' | 'title' | 'titleMultilingual' | 'url'
>;

export type ImageFeaturedWithCaption = ImageFeaturedObject & {
	captionMetadata?: ImageFeaturedCaptionMetadata | undefined;
};
