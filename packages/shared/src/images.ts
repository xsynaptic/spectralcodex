import type {
	CoverPresetName,
	ImageFormat,
	ImagePreset,
} from '@xsynaptic/astro-image-pipeline/presets';

import { createImagePresets } from '@xsynaptic/astro-image-pipeline/presets';

export const ImageSizeEnum = {
	ExtraExtraExtraLarge: 3600,
	ExtraExtraLarge: 2400,
	ExtraLarge: 1800,
	ExtraSmall: 450,
	Large: 1200,
	Medium: 900,
	Small: 600,
} as const;

const imageWidths = [
	ImageSizeEnum.ExtraSmall,
	ImageSizeEnum.Small,
	ImageSizeEnum.Medium,
	ImageSizeEnum.Large,
	ImageSizeEnum.ExtraLarge,
	ImageSizeEnum.ExtraExtraLarge,
	ImageSizeEnum.ExtraExtraExtraLarge,
];

// Hero and card crops share names, so a quality is per format, never per preset
export const imageQualityByFormat = {
	jpg: 85,
	webp: 70,
} as const satisfies Record<ImageFormat, number>;

export const imagePresets = {
	author: { fit: 'width', format: 'webp', widths: imageWidths.slice(0, 4) },
	card: { aspectRatio: 3 / 2, fit: 'cover', format: 'webp', widths: imageWidths.slice(0, 4) },
	'card-hq': { aspectRatio: 3 / 2, fit: 'cover', format: 'jpg', widths: imageWidths.slice(0, 5) },
	content: { fit: 'width', format: 'jpg', widths: imageWidths },
	feed: { fit: 'native', format: 'jpg', widths: [ImageSizeEnum.Medium, ImageSizeEnum.Large] },
	hero: { aspectRatio: 3 / 2, fit: 'cover', format: 'webp', widths: imageWidths },
	popup: { aspectRatio: 3 / 2, fit: 'cover', format: 'webp', widths: [350, 700] },
	search: { aspectRatio: 4 / 3, fit: 'cover', format: 'webp', widths: [64, 128] },
} as const satisfies Record<string, ImagePreset>;

export type ImagePresetName = keyof typeof imagePresets;

export type ImageCoverPresetName = CoverPresetName<typeof imagePresets>;

export const {
	getName: getImageName,
	getSize: getImagePresetSize,
	getWidths: getImagePresetWidths,
} = createImagePresets(imagePresets);
