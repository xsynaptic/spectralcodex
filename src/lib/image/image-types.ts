import type { CoreImageAttributes, UnpicBaseImageProps } from '@unpic/core';
import type { HTMLAttributes } from 'astro/types';
import type { IPXOptions } from 'unpic/providers/ipx';
import type { IPXOperations as BaseIPXOperations } from 'unpic/providers/ipx';

/**
 * Image proxy server types
 */
export const ImageFitOptionEnum = {
	Contain: 'contain',
	Cover: 'cover',
	Fill: 'fill',
	Inside: 'inside',
	Outside: 'outside',
} as const;

export type ImageFitOption = (typeof ImageFitOptionEnum)[keyof typeof ImageFitOptionEnum];

/**
 * Extended IPX operations interface
 *
 * The upstream unpic IPX provider only exposes basic operations (w, h, s, q, f)
 * IPX itself supports many more modifiers which pass through at runtime
 * This file extends the types to expose those additional operations
 *
 * TODO: remove this shim after Unpic introduces enhanced typing
 */
export interface IPXOperations extends BaseIPXOperations {
	fit?: ImageFitOption;
	position?: string;
	extract?: string;
	crop?: string;
	rotate?: number;
	flip?: boolean;
	flop?: boolean;
	blur?: number;
	sharpen?: number;
	grayscale?: boolean;
	background?: string;
}

/**
 * Image layout
 */
export const ImageLayoutEnum = {
	Default: 'default',
	Wide: 'wide',
	Full: 'full',
	None: 'none', // A special case for images in groups
} as const;

export type ImageLayout = (typeof ImageLayoutEnum)[keyof typeof ImageLayoutEnum];

export const ImageOrientationEnum = {
	Landscape: 'landscape',
	Portrait: 'portrait',
	Square: 'square',
} as const;

export type ImageOrientation = (typeof ImageOrientationEnum)[keyof typeof ImageOrientationEnum];

export const ImageSizeEnum = {
	ExtraSmall: 450,
	Small: 600,
	Medium: 900,
	Large: 1200,
	ExtraLarge: 1800,
	ExtraExtraLarge: 2400,
	ExtraExtraExtraLarge: 3600,
} as const;

/**
 * Image placeholder props
 */
export interface ImagePlaceholderProps {
	imageId: string;
	aspectRatio: number;
	fit?: ImageFitOption;
	position?: string;
	highQuality?: boolean;
}

/**
 * Unpic Image component props
 */
export type ImageComponentProps = HTMLAttributes<'img'> &
	Omit<UnpicBaseImageProps<IPXOperations, IPXOptions, CoreImageAttributes>, 'transformer'>;
