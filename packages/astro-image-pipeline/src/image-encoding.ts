import type { JpegOptions, WebpOptions } from 'sharp';

// Part of every cache key; bump it when a render change alters the output bytes
export const imageRenderRevision = 3;

export interface ImageEncoding {
	jpg?: JpegOptions;
	webp?: WebpOptions;
}

export interface ResolvedImageEncoding {
	jpg: JpegOptions;
	webp: WebpOptions;
}

const encodingDefaults = {
	jpg: { mozjpeg: true, quality: 80 },
	webp: { effort: 6, quality: 80 },
} as const satisfies ResolvedImageEncoding;

export function resolveImageEncoding(encoding: ImageEncoding = {}): ResolvedImageEncoding {
	return {
		jpg: { ...encodingDefaults.jpg, ...encoding.jpg },
		webp: { ...encodingDefaults.webp, ...encoding.webp },
	};
}

export function serializeEncoding(options: JpegOptions | WebpOptions) {
	const entries = Object.entries(options).toSorted(([first], [second]) =>
		first.localeCompare(second),
	);

	return JSON.stringify(Object.fromEntries(entries));
}
