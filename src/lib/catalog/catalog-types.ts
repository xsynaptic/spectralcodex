import type { ImageFeaturedObject } from '@spectralcodex/shared/schemas';
import type { CollectionKey } from 'astro:content';

import type { MultilingualContent } from '#lib/i18n/i18n-types.ts';
import type { DateRecordedEntry } from '#lib/utils/date.ts';

export type CatalogCollectionKey = Extract<
	CollectionKey,
	'locations' | 'pages' | 'posts' | 'regions' | 'series' | 'themes'
>;

// This is a subset of common properties of different content collections
export interface CatalogItem<T extends CatalogCollectionKey = CatalogCollectionKey> {
	backlinks: Set<string>;
	collection: T;
	dateCreated: Date;
	dateRecorded: Array<DateRecordedEntry> | undefined;
	dateUpdated: Date | undefined;
	description: string | undefined;
	entryQuality: number;
	id: string;
	imageHeroId: string | undefined;
	imageId: string | undefined;
	linksExternalCount: number | undefined;
	locationCount: number | undefined;
	postCount: number | undefined;
	regionPrimaryId: string | undefined;
	title: string;
	titleMultilingual: MultilingualContent | undefined;
	url: string;
	wordCount: number | undefined;
}

// Caption fields always resolve from a real item, so id/url are present (unlike a title-only caption)
export type CatalogCaption = Pick<CatalogItem, 'id' | 'title' | 'titleMultilingual' | 'url'>;

// Image featured data is sometimes displayed with a caption; title-only captions carry no id/url
export type ImageFeaturedCaption = Partial<Pick<CatalogItem, 'id' | 'url'>> &
	Pick<CatalogItem, 'title' | 'titleMultilingual'>;

export type ImageFeaturedWithCaption = ImageFeaturedObject & {
	caption?: ImageFeaturedCaption | undefined;
};
