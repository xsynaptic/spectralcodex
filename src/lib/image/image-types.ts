import type { CoreImageAttributes, UnpicBaseImageProps } from '@unpic/core';
import type { ImagorOperations, ImagorOptions } from '@xsynaptic/unpic-imagor';
import type { HTMLAttributes } from 'astro/types';
import type { ImageFormat } from 'unpic';

export const ImageFitOptionEnum = {
	Contain: 'contain',
	Cover: 'cover',
	Fill: 'fill',
	Inside: 'inside',
	Outside: 'outside',
} as const;

export type ImageFitOption = (typeof ImageFitOptionEnum)[keyof typeof ImageFitOptionEnum];

export const ImageLayoutEnum = {
	Default: 'default',
	Wide: 'wide',
	Full: 'full',
} as const;

export type ImageLayout = (typeof ImageLayoutEnum)[keyof typeof ImageLayoutEnum];

export const ImageContextEnum = {
	Single: 'single',
	Grid: 'grid',
	Carousel: 'carousel',
} as const;

export type ImageContext = (typeof ImageContextEnum)[keyof typeof ImageContextEnum];

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

export interface ImagePlaceholderProps {
	imageId: string;
	aspectRatio: number;
	fit?: ImageFitOption;
	position?: string;
	highQuality?: boolean;
}

export type ImageComponentProps = HTMLAttributes<'img'> &
	Omit<UnpicBaseImageProps<ImagorOperations, ImagorOptions, CoreImageAttributes>, 'transformer'> & {
		imageQuality?: number;
		imageFormat?: ImageFormat;
	};
