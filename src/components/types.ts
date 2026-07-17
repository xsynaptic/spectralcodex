// 2026Q1: TypeScript doesn't deal well with Astro files exporting types and interfaces

/**
 * Meta component types
 */
interface MetaImageProps {
	url?: URL | string;
	secureUrl?: URL | string;
	type?: string;
	width?: number;
	height?: number;
	alt?: string;
}

export interface MetaProps {
	title?: string | undefined;
	description?: string | undefined;
	ogType?: 'article' | 'website' | undefined;
	image?: MetaImageProps | undefined;
	imageAlt?: string | undefined;
	article?: {
		publishedTime?: string;
		modifiedTime?: string;
		expirationTime?: string;
		authors?: Array<string>;
		section?: string;
		tags?: Array<string>;
	};
	prefetchUrls?: Array<string> | undefined;
	noIndex?: boolean;
	noFollow?: boolean;
}

/**
 * Divider component types; values map onto divided-* classes in divider.css
 */
export type DividerColor = 'default' | 'lighter';

export type DividerContent = 'chevron' | 'dot' | 'slash';

export type DividerWeight = 'thin';

/**
 * Preview display options
 */
export interface PreviewOptions {
	showCollection?: boolean | undefined;
	showDate?: boolean | undefined;
	showDescription?: boolean | undefined;
	showLocations?: boolean | undefined;
	showRegion?: boolean | undefined;
	showPosts?: boolean | undefined;
	showTitleMultilingual?: boolean | undefined;
}

/**
 * Microformats used in this project are defined here as an enum
 */
export const MicroformatClassNames = {
	Author: 'p-author',
	Card: 'h-card',
	Category: 'p-category',
	DatePublished: 'dt-published',
	DateUpdated: 'dt-updated',
	Entry: 'h-entry',
	Name: 'p-name',
	Organization: 'p-org',
	Photo: 'u-photo',
	Role: 'p-role',
	Url: 'u-url',
} as const;

/**
 * An enum to help keep z-index values in check
 */
export const zIndexScaleEnum = {
	ImageBase: 10,
	ImageShadow: 11,
	ImageHeader: 12,
	ImageCaption: 15,
	ImageNavigation: 15,
	MainHeader: 40,
	MainTopButton: 45,
	MainProgress: 60,
	MainSkipLink: 70,
} as const;
