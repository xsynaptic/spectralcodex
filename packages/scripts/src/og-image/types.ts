export interface OpenGraphContentEntry extends OpenGraphEntryItem {
	digest: string;
}

export interface OpenGraphEntryItem extends OpenGraphMetadataItem {
	imageFeaturedId: string;
}

export interface OpenGraphMetadataItem {
	collection: string;
	id: string;
	isFallback: boolean;
	title: string;
	titleJa?: string | undefined;
	titleTh?: string | undefined;
	titleZh?: string | undefined;
}
