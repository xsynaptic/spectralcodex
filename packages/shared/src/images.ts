export const imageManifestFile = 'manifest.json';
export const imageConsumedManifestFile = 'manifest-consumed.json';
export const imageBuildIdFile = 'image-build-id.txt';

export function getImageCachePaths(cachePath: string) {
	return {
		derivativesPath: `${cachePath}/img`,
		devPath: `${cachePath}/img-dev`,
		statePath: `${cachePath}/img-state`,
	};
}

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
} as const;

export type ImageFormat = keyof typeof imageQualityByFormat;

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

type ImageHeightPresetName = {
	[Name in ImagePresetName]: (typeof imagePresets)[Name] extends ImagePresetWidth ? never : Name;
}[ImagePresetName];

export interface ImageDimensions {
	height: number;
	width: number;
}

export interface ImageSource extends ImageDimensions {
	id: string;
}

interface ImageSize {
	height?: number;
	width: number;
}

export interface ImageDerivative extends ImageSize {
	format: ImageFormat;
	id: string;
	path: string;
}

export interface ImageManifest {
	buildId: string;
	derivatives: Array<ImageDerivative>;
	mediaPath: string;
	sources: Record<string, ImageDimensions>;
}

interface ImageManifestRecorder {
	derivatives: Map<string, ImageDerivative>;
	sources: Map<string, ImageDimensions>;
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

function isWithinSource(size: ImageSize, source: ImageDimensions) {
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

export function getImagePresetWidths(presetName: ImagePresetName, source: ImageDimensions) {
	const preset: ImagePreset = imagePresets[presetName];

	return preset.widths.filter((width) =>
		isWithinSource(getPresetSize(preset, width, source), source),
	);
}

export function getImagePresetSize(
	presetName: ImageHeightPresetName,
	width: number,
	source: ImageDimensions,
): Required<ImageSize>;
export function getImagePresetSize(
	presetName: ImagePresetName,
	width: number,
	source: ImageDimensions,
): ImageSize;
export function getImagePresetSize(
	presetName: ImagePresetName,
	width: number,
	source: ImageDimensions,
) {
	return capImageSize(getPresetSize(imagePresets[presetName], width, source), source);
}

function getImageName(id: string, size: ImageSize, format: ImageFormat) {
	const stem = id.replace(/\.[^./]+$/, '');
	const dimensions =
		size.height === undefined ? String(size.width) : `${String(size.width)}x${String(size.height)}`;

	return `${stem}-${dimensions}.${format}`;
}

const recorderKey = Symbol.for('scx-image-manifest');

// Prerender chunks and integrations load separate copies of this module, so the state lives on `globalThis`
export function getImageManifestRecorder(): ImageManifestRecorder {
	const store = globalThis as typeof globalThis & { [recorderKey]?: ImageManifestRecorder };
	const existing = store[recorderKey];

	if (existing) return existing;

	const recorder = { derivatives: new Map(), sources: new Map() };

	store[recorderKey] = recorder;

	return recorder;
}

function recordImageDerivative({ id, ...source }: ImageSource, derivative: ImageDerivative) {
	const recorder = getImageManifestRecorder();
	const existing = recorder.derivatives.get(derivative.path);

	if (existing && existing.id !== id) {
		throw new Error(`Image name ${derivative.path} is claimed by both ${existing.id} and ${id}`);
	}

	recorder.sources.set(id, source);
	recorder.derivatives.set(derivative.path, derivative);
}

// A capped width is valid only as the cap of some preset width, so the set of derivatives stays closed
function resolvePresetSize(preset: ImagePreset, width: number, source: ImageDimensions) {
	for (const presetWidth of preset.widths) {
		const size = capImageSize(getPresetSize(preset, presetWidth, source), source);

		if (size.width === width) return size;
	}

	return;
}

export function getImageDerivative(
	source: ImageSource,
	presetName: ImagePresetName,
	width: number | undefined,
): ImageDerivative {
	if (width === undefined) throw new Error(`Image ${source.id} needs a width for "${presetName}"`);

	const preset: ImagePreset = imagePresets[presetName];

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

	const derivative = {
		format: preset.format,
		id: source.id,
		path: getImageName(source.id, size, preset.format),
		...size,
	};

	recordImageDerivative(source, derivative);

	return derivative;
}

export function getImageDerivatives(source: ImageSource): Array<ImageDerivative> {
	return Object.values(imagePresets).flatMap((preset: ImagePreset) =>
		preset.widths.map((width) => {
			const size = capImageSize(getPresetSize(preset, width, source), source);

			return {
				format: preset.format,
				id: source.id,
				path: getImageName(source.id, size, preset.format),
				...size,
			};
		}),
	);
}
