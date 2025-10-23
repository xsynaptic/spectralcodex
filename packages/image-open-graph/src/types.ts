import type { FontStyle, FontWeight, SatoriOptions } from 'satori';

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

export interface OpenGraphImageFontVariant {
	weight: FontWeight;
	style: FontStyle;
	subset: string;
}

export interface OpenGraphImageFontConfig {
	family: string;
	variants: Array<OpenGraphImageFontVariant>;
}

export type OpenGraphSatoriOptions = SatoriOptions & {
	density?: number;
};
