import type { ImageFormat, ImageSize } from '#image-name.ts';

import { formatImageName, getImageStem } from '#image-name.ts';

export interface ImagePresetCover {
	aspectRatio: number;
	fit: 'cover';
	format: ImageFormat;
	widths: ReadonlyArray<number>;
}

export interface ImagePresetNative {
	fit: 'native';
	format: ImageFormat;
	widths: ReadonlyArray<number>;
}

export interface ImagePresetWidth {
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

// A width that isn't in the preset is only accepted when one of the preset's widths shrinks to it for this source
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

		if (
			!isWithinSource(getPresetSize(preset, width, source), source) &&
			preset.widths.includes(width)
		) {
			throw new Error(
				`Image ${source.id} (${String(source.width)}x${String(source.height)}) is too small for "${presetName}" at ${String(width)}`,
			);
		}

		const size = resolvePresetSize(preset, width, source);

		if (!size) throw new Error(`Width ${String(width)} is not in the "${presetName}" preset`);

		return formatImageName({ format: preset.format, stem: getImageStem(source.id), ...size });
	}

	return { getName, getSize, getWidths };
}
