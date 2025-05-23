import type { CollectionKey } from 'astro:content';

// This is a subset of common properties of different content collections
export interface ContentMetadataItem<T extends CollectionKey = CollectionKey> {
	collection: T;
	id: string;
	title: string;
	titleAlt: string | undefined;
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
