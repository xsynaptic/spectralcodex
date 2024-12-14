import type { SEOProps } from 'astro-seo';

// Note: this file exists because Astro components can't reliably export types

/**
 * Meta
 */
export interface MetaProps {
	title?: string | undefined;
	description?: string | undefined;
	ogType?: 'article' | 'website' | undefined;
	image?: NonNullable<SEOProps['openGraph']>['image'];
	imageId?: string | undefined;
	imageAlt?: string | undefined;
	article?: {
		publishedTime?: string;
		modifiedTime?: string;
		expirationTime?: string;
		authors?: string[];
		section?: string;
		tags?: string[];
	};
	prefetchUrls?: string[] | undefined;
}

/**
 * Date
 */
export type DatePreset = 'short' | 'medium' | 'long';

/**
 * Divider
 */
export type DividerColor = 'default' | 'lighter' | 'darker' | 'hero';

export type DividerContent = 'bar' | 'bullet' | 'chevron' | 'dot' | 'slash';

/**
 * Content preview items
 */
export interface PreviewItemProps {
	showCollection?: boolean | undefined;
	showDate?: boolean | undefined;
	showDescription?: boolean | undefined;
	showDescriptionCompact?: boolean | undefined;
	showLocations?: boolean | undefined;
	showRegion?: boolean | undefined;
	showPosts?: boolean | undefined;
	showTitleAlt?: boolean | undefined;
	showWordCount?: boolean | undefined;
}
