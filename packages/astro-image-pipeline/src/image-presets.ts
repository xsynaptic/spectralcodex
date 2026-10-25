import type { ImageEncoding } from '#image-encoding.ts';
import type { ImageFormat, ImageSize } from '#image-name.ts';

import { resolveImageEncoding } from '#image-encoding.ts';
import { formatImageName, getImageStem, isImageStem } from '#image-name.ts';
import { recordImageName } from '#image-recorder.ts';

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

export type ImagePreset = ImagePresetCover | ImagePresetNative | ImagePresetWidth;

type ImagePresetTable = Record<string, ImagePreset>;

export type CoverPresetName<Table extends ImagePresetTable> = {
	[Name in keyof Table & string]: Table[Name] extends ImagePresetCover ? Name : never;
}[keyof Table & string];

type HeightPresetName<Table extends ImagePresetTable> = {
	[Name in keyof Table & string]: Table[Name] extends ImagePresetWidth ? never : Name;
}[keyof Table & string];

export interface ImageDimensions {
	height: number;
	width: number;
}

export interface ImageSource extends ImageDimensions {
	id: string;
	path?: string;
}

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

export function isWithinSource(size: ImageSize, source: ImageDimensions) {
	return size.width <= source.width && (size.height ?? 0) <= source.height;
}

function capImageSize(size: ImageSize, source: ImageDimensions): ImageSize {
	if (isWithinSource(size, source)) return size;

	if (size.height === undefined) return { width: source.width };

	const width =
		source.width * size.height <= source.height * size.width
			? source.width
			: Math.floor((size.width * source.height) / size.height);

	return {
		height: Math.min(Math.round((width * size.height) / size.width), source.height),
		width,
	};
}

// A width outside the preset is fine when one of the preset's widths shrinks to it on this source
function resolvePresetSize(preset: ImagePreset, width: number, source: ImageDimensions) {
	for (const presetWidth of preset.widths) {
		const size = capImageSize(getPresetSize(preset, presetWidth, source), source);

		if (size.width === width) return size;
	}

	return;
}

export function createImagePresets<const Table extends Record<keyof Table, ImagePreset>>(
	table: Table,
) {
	type PresetName = keyof Table & string;

	function getWidths(presetName: PresetName, source: ImageDimensions) {
		const preset: ImagePreset = table[presetName];

		return preset.widths.filter((width) =>
			isWithinSource(getPresetSize(preset, width, source), source),
		);
	}

	function getSize(
		presetName: HeightPresetName<Table>,
		width: number,
		source: ImageDimensions,
	): Required<ImageSize>;
	function getSize(presetName: PresetName, width: number, source: ImageDimensions): ImageSize;
	function getSize(presetName: PresetName, width: number, source: ImageDimensions) {
		return capImageSize(getPresetSize(table[presetName], width, source), source);
	}

	function getName(source: ImageSource, presetName: PresetName, width: number | undefined) {
		if (width === undefined)
			throw new Error(`Image ${source.id} needs a width for "${presetName}"`);

		const preset: ImagePreset = table[presetName];
		const size = resolvePresetSize(preset, width, source);

		if (!size) {
			throw new Error(
				`Image ${source.id} (${String(source.width)}x${String(source.height)}) has no "${presetName}" rendition ${String(width)} wide`,
			);
		}

		const stem = getImageStem(source.id);

		if (!isImageStem(stem)) {
			throw new Error(
				`Image ${source.id} can't be named: whitespace, quotes, &, <, >, ), commas and "." or ".." segments don't fit in an image URL; rename the file`,
			);
		}

		const name = formatImageName({ format: preset.format, stem, ...size });

		recordImageName(name, source.path ?? source.id);

		return name;
	}

	return { getName, getSize, getWidths };
}

export function defineImagePipeline<const Table extends Record<keyof Table, ImagePreset>>({
	encoding,
	presets,
}: {
	encoding?: ImageEncoding;
	presets: Table;
}) {
	return { ...createImagePresets(presets), encoding: resolveImageEncoding(encoding) };
}
