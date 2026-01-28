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
	imageId?: string | undefined;
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
 * Divider component types
 */
export const DividerColorEnum = {
	Default: 'default',
	Lighter: 'lighter',
	Darker: 'darker',
	Hero: 'hero',
} as const;

export type DividerColor = (typeof DividerColorEnum)[keyof typeof DividerColorEnum];

export const DividerContentEnum = {
	Bar: 'bar',
	Bullet: 'bullet',
	Chevron: 'chevron',
	Dot: 'dot',
	Slash: 'slash',
} as const;

export type DividerContent = (typeof DividerContentEnum)[keyof typeof DividerContentEnum];

/**
 * Metadata item props
 */
export interface MetadataGridOptions {
	showCollection?: boolean | undefined;
	showDate?: boolean | undefined;
	showDescription?: boolean | undefined;
	showLocations?: boolean | undefined;
	showRegion?: boolean | undefined;
	showPosts?: boolean | undefined;
	showTitleMultilingual?: boolean | undefined;
}
