export interface OpenGraphMetadataItem {
	collection: string;
	id: string;
	title: string;
	titleZh?: string | undefined;
	titleJa?: string | undefined;
	titleTh?: string | undefined;
	isFallback: boolean;
}

export interface OpenGraphContentEntry extends OpenGraphMetadataItem {
	digest: string;
	imageFeaturedId: string;
}
