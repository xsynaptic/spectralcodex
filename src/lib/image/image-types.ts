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

export const ImageSizeEnum = {
	ExtraExtraExtraLarge: 3600,
	ExtraExtraLarge: 2400,
	ExtraLarge: 1800,
	ExtraSmall: 450,
	Large: 1200,
	Medium: 900,
	Small: 600,
} as const;

export type ImageComponentProps = HTMLAttributes<'img'> &
	Omit<UnpicBaseImageProps<ImagorOperations, ImagorOptions, CoreImageAttributes>, 'transformer'> & {
		imageFormat?: ImageFormat;
		imageQuality?: number;
	};

export interface ImagePlaceholderProps {
	aspectRatio: number;
	fit?: ImageFitOption;
	highQuality?: boolean;
	imageId: string;
	position?: string;
}
