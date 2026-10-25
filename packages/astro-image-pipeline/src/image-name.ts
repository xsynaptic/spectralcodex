export const imageFormats = ['jpg', 'webp'] as const;

export type ImageFormat = (typeof imageFormats)[number];

export interface ImageSize {
	height?: number;
	width: number;
}

export interface ImageName extends ImageSize {
	format: ImageFormat;
	stem: string;
}

const imageNameTerminators = String.raw`\s"'&<>),`;

const imageNamePatternSource = String.raw`(?<stem>[^${imageNameTerminators}]+?)-(?<width>[1-9]\d*)(?:x(?<height>[1-9]\d*))?\.(?<format>${imageFormats.join('|')})`;

const imageNamePattern = new RegExp(`^${imageNamePatternSource}$`);

const imageStemPattern = new RegExp(`^[^${imageNameTerminators}]+$`);

const unsafeSegments = new Set(['', '.', '..']);

const sourcePattern = /\.(?:avif|gif|jpe?g|png|webp)$/i;

function isFormat(value: string | undefined): value is ImageFormat {
	return (imageFormats as ReadonlyArray<string | undefined>).includes(value);
}

function isSafeStem(stem: string) {
	return stem.split('/').every((segment) => !unsafeSegments.has(segment));
}

export function isImageSource(id: string) {
	return sourcePattern.test(id);
}

export function getImageStem(id: string) {
	return id.replace(/\.[^./]+$/, '');
}

export function isImageStem(stem: string) {
	return imageStemPattern.test(stem) && isSafeStem(stem);
}

// Names drop the extension, so a.jpg and a.png (or A.png on a case-insensitive disk) would collide
export function findStemCollisions(ids: Iterable<string>) {
	const idsByStem = Map.groupBy(ids, (id) => getImageStem(id).toLowerCase());

	return [...idsByStem.values()]
		.filter((stemIds) => stemIds.length > 1)
		.map((stemIds) => stemIds.toSorted((first, second) => first.localeCompare(second)));
}

export function formatImageName({ format, height, stem, width }: ImageName) {
	const size = height === undefined ? String(width) : `${String(width)}x${String(height)}`;

	return `${stem}-${size}.${format}`;
}

export function parseImageName(name: string): ImageName | undefined {
	const { format, height, stem, width } = imageNamePattern.exec(name)?.groups ?? {};

	if (stem === undefined || width === undefined || !isFormat(format) || !isSafeStem(stem)) return;

	const parsed: ImageName = { format, stem, width: Number(width) };

	if (height !== undefined) parsed.height = Number(height);

	return parsed;
}
