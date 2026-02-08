import type { FontStyle, FontWeight } from 'satori';

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
