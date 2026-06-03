import type { ImageFeaturedObject } from '@spectralcodex/shared/schemas';
import type { CollectionKey } from 'astro:content';

import type { MultilingualContent } from '#lib/i18n/i18n-types.ts';

export type CatalogCollectionKey = Extract<
	CollectionKey,
	'notes' | 'locations' | 'pages' | 'posts' | 'regions' | 'series' | 'themes'
>;

// This is a subset of common properties of different content collections
export interface CatalogItem<T extends CatalogCollectionKey = CatalogCollectionKey> {
	collection: T;
	id: string;
	title: string;
	titleMultilingual: MultilingualContent | undefined;
	description: string | undefined;
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

// Caption fields always resolve from a real item, so id/url are present (unlike a title-only caption)
export type CatalogCaption = Pick<CatalogItem, 'title' | 'titleMultilingual' | 'id' | 'url'>;

// Image featured data is sometimes displayed with a caption; title-only captions carry no id/url
export type ImageFeaturedCaption = Pick<CatalogItem, 'title' | 'titleMultilingual'> &
	Partial<Pick<CatalogItem, 'id' | 'url'>>;

export type ImageFeaturedWithCaption = ImageFeaturedObject & {
	caption?: ImageFeaturedCaption | undefined;
};
