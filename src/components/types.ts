// 2026Q1: TypeScript doesn't deal well with Astro files exporting types and interfaces

// Meta component types
interface MetaImageProps {
	alt?: string;
	height?: number;
	secureUrl?: string | URL;
	type?: string;
	url?: string | URL;
	width?: number;
}

export interface MetaProps {
	article?: {
		authors?: Array<string>;
		expirationTime?: string;
		modifiedTime?: string;
		publishedTime?: string;
		section?: string;
		tags?: Array<string>;
	};
	description?: string | undefined;
	image?: MetaImageProps | undefined;
	imageAlt?: string | undefined;
	noFollow?: boolean;
	noIndex?: boolean;
	ogType?: 'article' | 'website' | undefined;
	prefetchUrls?: Array<string> | undefined;
	title?: string | undefined;
}

// Values map onto divided-* classes in text.css
export type DividerColor = 'default' | 'muted';

export type DividerContent = 'chevron' | 'dot' | 'slash';

export type DividerWeight = 'thin';

export const NoticeBoxSeverityEnum = {
	Info: 'info',
	Success: 'success',
	Warning: 'warning',
	Error: 'error',
} as const;

export type NoticeBoxSeverity = (typeof NoticeBoxSeverityEnum)[keyof typeof NoticeBoxSeverityEnum];

// Preview display options
export interface PreviewOptions {
	showCollection?: boolean | undefined;
	showDate?: boolean | undefined;
	showDescription?: boolean | undefined;
	showLocations?: boolean | undefined;
	showPosts?: boolean | undefined;
	showRegion?: boolean | undefined;
	showTitleMultilingual?: boolean | undefined;
}

// Microformats used in this project are defined here as an enum
export const MicroformatClassNames = {
	Author: 'p-author',
	Card: 'h-card',
	Category: 'p-category',
	DatePublished: 'dt-published',
	DateUpdated: 'dt-updated',
	Entry: 'h-entry',
	Feed: 'h-feed',
	Name: 'p-name',
	Organization: 'p-org',
	Photo: 'u-photo',
	Role: 'p-role',
	Summary: 'p-summary',
	Url: 'u-url',
} as const;
