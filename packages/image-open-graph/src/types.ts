// This replicates some parts of ContentMetadataItem
export interface OpenGraphMetadataItem {
	collection: string;
	id: string;
	title: string;
	description?: string | undefined;
	date: Date;
	regionPrimaryId: string | undefined;
	postCount: number | undefined;
	locationCount: number | undefined;
}
