export interface OpenGraphMetadataItem {
	collection: string;
	id: string;
	title: string;
	titleZh?: string | undefined;
	titleJa?: string | undefined;
	titleTh?: string | undefined;
	isFallback: boolean;
}

export interface OpenGraphEntryItem extends OpenGraphMetadataItem {
	imageFeaturedId: string;
}

export interface OpenGraphContentEntry extends OpenGraphEntryItem {
	digest: string;
}
