import type {
	ImageDimensions,
	ImageFormat,
	ImageSize,
	ImageSource,
} from '@xsynaptic/astro-image-pipeline/names';

import {
	fitWithinSource,
	getSizedName,
	isWithinSource,
} from '@xsynaptic/astro-image-pipeline/names';

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

interface ImagePresetCover {
	aspectRatio: number;
	fit: 'cover';
	format: ImageFormat;
	widths: ReadonlyArray<number>;
}

interface ImagePresetNative {
	fit: 'native';
	format: ImageFormat;
	widths: ReadonlyArray<number>;
}

interface ImagePresetWidth {
	fit: 'width';
	format: ImageFormat;
	widths: ReadonlyArray<number>;
}

type ImagePreset = ImagePresetCover | ImagePresetNative | ImagePresetWidth;

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

export type ImageCoverPresetName = {
	[Name in ImagePresetName]: (typeof imagePresets)[Name] extends ImagePresetCover ? Name : never;
}[ImagePresetName];

function getPresetSize(preset: ImagePreset, width: number, source: ImageDimensions): ImageSize {
	switch (preset.fit) {
		case 'cover': {
			return { height: Math.round(width / preset.aspectRatio), width };
		}
		case 'native': {
			return { height: Math.round((width * source.height) / source.width), width };
		}
		case 'width': {
			return { width };
		}
	}
}

function resolvePresetSize(preset: ImagePreset, width: number, source: ImageDimensions) {
	for (const presetWidth of preset.widths) {
		const size = fitWithinSource(getPresetSize(preset, presetWidth, source), source);

		if (size.width === width) return size;
	}

	return;
}

export function getImagePresetWidths(presetName: ImagePresetName, source: ImageDimensions) {
	const preset: ImagePreset = imagePresets[presetName];

	return preset.widths.filter((width) =>
		isWithinSource(getPresetSize(preset, width, source), source),
	);
}

export function getImagePresetSize(
	presetName: ImagePresetName,
	width: number,
	source: ImageDimensions,
) {
	return fitWithinSource(getPresetSize(imagePresets[presetName], width, source), source);
}

export function getImageName(
	source: ImageSource,
	presetName: ImagePresetName,
	width: number | undefined,
) {
	if (width === undefined) throw new Error(`Image ${source.id} needs a width for "${presetName}"`);

	const preset: ImagePreset = imagePresets[presetName];
	const size = resolvePresetSize(preset, width, source);

	if (!size) {
		throw new Error(
			`Image ${source.id} (${String(source.width)}x${String(source.height)}) has no "${presetName}" rendition ${String(width)} wide`,
		);
	}

	return getSizedName(source, { format: preset.format, ...size });
}
