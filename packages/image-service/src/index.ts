import sharpDefaultService from 'astro/assets/services/sharp';
import { VALID_OUTPUT_FORMATS } from 'node_modules/astro/dist/assets/consts';
import sharp from 'sharp';

import type { ImageMetadata, ImageTransform, LocalImageService } from 'astro';
import type { SharpImageServiceConfig } from 'astro/assets/services/sharp';

/**
 * This custom image service adapts code from Astro core to accomplish several goals:
 * - fine-tuning of `srcset` attribute output
 * - avoid image upscaling
 * - render progressive JPEGs for use with the low-quality image placeholder (LQIP) technique
 * It has also been modified to work better with stricter TypeScript settings in some places
 */
interface UnresolvedSrcSetValue {
	transform: ImageTransform;
	descriptor?: string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	attributes?: Record<string, any>;
}

const DEFAULT_OUTPUT_FORMAT = 'jpg';

function isESMImportedImage(src: ImageMetadata | string): src is ImageMetadata {
	return (
		typeof src === 'object' &&
		typeof src.src === 'string' &&
		typeof src.width === 'number' &&
		typeof src.height === 'number'
	);
}

/**
 * Returns the final dimensions of an image based on the user's options.
 *
 * For local images:
 * - If the user specified both width and height, we'll use those.
 * - If the user specified only one of them, we'll use the original image's aspect ratio to calculate the other.
 * - If the user didn't specify either, we'll use the original image's dimensions.
 *
 * For remote images:
 * - Widths and heights are always required, so we'll use the user's specified width and height.
 */
function getTargetDimensions({ src, width, height }: ImageTransform) {
	let targetWidth = width;
	let targetHeight = height;

	if (isESMImportedImage(src)) {
		const aspectRatio = src.width / src.height;
		if (targetHeight && !targetWidth) {
			// If we have a height but no width, use height to calculate the width
			targetWidth = Math.round(targetHeight * aspectRatio);
		} else if (targetWidth && !targetHeight) {
			// If we have a width but no height, use width to calculate the height
			targetHeight = Math.round(targetWidth / aspectRatio);
		} else if (!targetWidth && !targetHeight) {
			// If we have neither width or height, use the original image's dimensions
			targetWidth = src.width;
			targetHeight = height;
		}
	}

	// TypeScript doesn't know this, but because of previous hooks we always know that targetWidth and targetHeight are defined
	return {
		targetWidth: targetWidth!,
		targetHeight: targetHeight!,
	};
}

/**
 * Note: this custom image service wraps the core image service used by Astro
 * Only the `getSrcSet` function is modified to better handle some scenarios described below
 * By necessity, some additional code was copied from Astro to match existing functionality
 * If this turns out to be useful it might be cool to contribute this back to core
 */
const service = {
	...sharpDefaultService,
	// This function will not run if the cache has already been seeded
	async transform(inputBuffer, transformOptions, config) {
		const transform = transformOptions as ImageTransform & {
			format?: (typeof VALID_OUTPUT_FORMATS)[number] | undefined; // Avoid arbitrary strings
		};

		// Do not transform SVG
		if (transform.format === 'svg') return { data: inputBuffer, format: 'svg' };

		const result = sharp(inputBuffer, {
			failOn: 'error',
			pages: -1,
			limitInputPixels: config.service.config.limitInputPixels,
		});

		// Auto-orient based on EXIF data
		result.rotate();

		// Resize proportionately
		if (transform.height && !transform.width) {
			result.resize({ height: Math.round(transform.height) });
		} else if (transform.width) {
			result.resize({ width: Math.round(transform.width) });
		}

		// Note: Astro's default quality handling functions were removed, requiring a numeric value
		if (transform.format) {
			result.toFormat(transform.format, {
				quality: Number(transform.quality ?? 80),
				...(transform.format === 'jpg' || transform.format === 'jpeg' ? { progressive: true } : {}),
			});
		}

		const { data, info } = await result.toBuffer({ resolveWithObject: true });

		// Note: the `new Uint8Array` is used to work around a type error being thrown in 2024Q3
		return {
			data: new Uint8Array(data),
			format: info.format,
		};
	},
	getSrcSet({ src, height, width, widths, densities, quality, format }) {
		const srcSet: UnresolvedSrcSetValue[] = [];
		const { targetWidth } = getTargetDimensions({ src, height, width });
		const targetFormat = format ?? DEFAULT_OUTPUT_FORMAT;

		// For remote images, we don't know the original image's dimensions, so we cannot know the maximum width
		// It is ultimately the user's responsibility to make sure they don't request images larger than the original
		let imageWidth = width;
		let maxWidth = Infinity;

		// However, if it's an imported image, we can use the original image's width as a maximum width
		if (isESMImportedImage(src)) {
			imageWidth = src.width;
			maxWidth = imageWidth;
		}

		// Collect widths to generate from specified densities or widths
		const allWidths: { maxTargetWidth: number; descriptor: `${number}x` | `${number}w` }[] = [];

		if (densities) {
			// Densities can either be specified as numbers, or descriptors (ex: '1x'), we'll convert them all to numbers
			const densityValues = densities.map((density) => {
				return typeof density === 'number' ? density : Number.parseFloat(density);
			});

			// Calculate the widths for each density, rounding to avoid floats.
			const densityWidths = densityValues
				.sort()
				.map((density) => Math.round(targetWidth * density));

			// Deduplicate widths and avoid up-scaling
			for (const [index, width] of [...new Set(densityWidths)].entries()) {
				if (width <= maxWidth && densityValues[index]) {
					allWidths.push({
						maxTargetWidth: width,
						// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
						descriptor: `${Number(densityValues[index])}x` as const,
					});
				}
			}
		} else if (widths) {
			// Deduplicate widths and avoid up-scaling
			for (const width of new Set(widths)) {
				if (width <= maxWidth) {
					allWidths.push({
						maxTargetWidth: width,
						// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
						descriptor: `${width}w` as const,
					});
				}
			}
		}

		// Caution: the logic below is tricky, and we need to avoid two pitfalls:
		// 1) up-scaling
		// 2) generating the same image multiple times
		// When making changes, make sure to test with different combinations of local/remote images widths, densities, and dimensions etc.
		for (const { maxTargetWidth, descriptor } of allWidths) {
			const srcSetTransform: ImageTransform = { src, widths, densities, quality, format };

			if (isESMImportedImage(src)) {
				// Local images should be transformed unless the following conditions are true:
				// 1) the original is being rendered at its real width
				// 2) the original is the same file format
				if (maxTargetWidth !== targetWidth || targetWidth !== src.width || format !== src.format) {
					srcSetTransform.width = maxTargetWidth;
				}
			} else {
				// Remote images use dimensions passed to this function to avoid regenerating the original
				if (width && height) {
					srcSetTransform.width = width;
					srcSetTransform.height = height;
				}
			}

			srcSet.push({
				transform: srcSetTransform,
				descriptor,
				attributes: {
					type: `image/${targetFormat}`,
				},
			});
		}

		return srcSet;
	},
} satisfies LocalImageService<SharpImageServiceConfig>;

export default service;
