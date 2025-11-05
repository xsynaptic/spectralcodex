import type { FontStyle, FontWeight, SatoriOptions } from 'satori';

export interface OpenGraphMetadataItem {
	collection: string;
	id: string;
	title: string;
	subtitle?: string | undefined;
	category?: string | undefined;
	description?: string | undefined;
	dateCreated: Date;
	dateUpdated?: Date | undefined;
	icon?: string | undefined;
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
