import type { ImagePresetName } from '@spectralcodex/shared/images';
import type { ImageSource } from '@xsynaptic/astro-image-pipeline/names';
import type { HTMLAttributes } from 'astro/types';

export const ImageFitOptionEnum = {
	Cover: 'cover',
} as const;

export type ImageFitOption = (typeof ImageFitOptionEnum)[keyof typeof ImageFitOptionEnum];

export const ImageLayoutEnum = {
	Default: 'default',
	Full: 'full',
	Wide: 'wide',
} as const;

export type ImageLayout = (typeof ImageLayoutEnum)[keyof typeof ImageLayoutEnum];

export const ImageContextEnum = {
	Carousel: 'carousel',
	Grid: 'grid',
	Single: 'single',
} as const;

export type ImageContext = (typeof ImageContextEnum)[keyof typeof ImageContextEnum];

export const ImageOrientationEnum = {
	Landscape: 'landscape',
	Portrait: 'portrait',
	Square: 'square',
} as const;

export type ImageOrientation = (typeof ImageOrientationEnum)[keyof typeof ImageOrientationEnum];

export interface ImageComponentProps extends Omit<
	HTMLAttributes<'img'>,
	'alt' | 'height' | 'sizes' | 'src' | 'srcset' | 'width'
> {
	alt: string;
	imageSource: ImageSource;
	preset: ImagePresetName;
	priority?: boolean;
	sizes: string;
	width: number;
}

export interface ImagePlaceholderProps {
	aspectRatio: number;
	fit?: ImageFitOption;
	highQuality?: boolean;
	imageId: string;
	position?: string;
}
