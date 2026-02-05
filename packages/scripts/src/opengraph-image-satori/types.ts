import type { FontStyle, FontWeight, SatoriOptions } from 'satori';

export interface OpenGraphMetadataItem {
	collection: string;
	id: string;
	title: string;
	titleZh?: string | undefined;
	titleJa?: string | undefined;
	titleTh?: string | undefined;
}

export interface OpenGraphFontVariant {
	weight: FontWeight;
	style: FontStyle;
	subset: string;
}

export interface OpenGraphFontConfig {
	/** npm package name (e.g., 'geologica' for @fontsource/geologica) */
	package: string;
	/** CSS font-family name (e.g., 'Geologica') */
	name: string;
	variants: Array<OpenGraphFontVariant>;
}

export type OpenGraphSatoriOptions = SatoriOptions & {
	density?: number;
};
