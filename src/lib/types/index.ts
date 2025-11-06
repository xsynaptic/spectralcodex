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
	title: string;
	url: string;
	children?: Array<MenuItem>;
}

/**
 * Metadata
 */
// This is a subset of common properties of different content collections
export interface ContentMetadataItem<T extends CollectionKey = CollectionKey> {
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

/**
 * Timeline
 */
export interface TimelineMonthlyData {
	title: string;
	highlight: ContentMetadataItem | undefined;
	posted: Set<ContentMetadataItem>;
	postedCount: number;
	created: Set<ContentMetadataItem>;
	createdCount: number;
	updated: Set<ContentMetadataItem>;
	updatedCount: number;
	visited: Set<ContentMetadataItem>;
	visitedCount: number;
}

export type TimelineDataMap = Map<string, Map<string, TimelineMonthlyData>>;
