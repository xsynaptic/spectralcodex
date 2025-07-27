// This replicates some parts of ContentMetadataItem since we can't import it directly
export interface OpenGraphMetadataItem {
	collection: string;
	id: string;
	title: string;
	title_zh?: string | undefined;
	description?: string | undefined;
	date: Date;
	regionPrimaryId: string | undefined;
	postCount: number | undefined;
	locationCount: number | undefined;
	wordCount: number | undefined;
}
