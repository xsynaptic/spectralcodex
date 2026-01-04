import type { CollectionKey } from 'astro:content';

/**
 * i18n
 */
// TODO: standardize language and script code handling
export const LanguageCodeEnum = {
	English: 'en',
	ChineseTraditional: 'zh',
	ChineseSimplified: 'zh-CN',
	Japanese: 'ja',
	Thai: 'th',
	Korean: 'ko',
	Vietnamese: 'vi',
} as const;

export type LanguageCode = (typeof LanguageCodeEnum)[keyof typeof LanguageCodeEnum];

export interface MultilingualContent {
	lang: LanguageCode;
	value: string;
}

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
