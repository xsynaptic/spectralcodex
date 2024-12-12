import { tailwindConfig } from '@spectralcodex/tailwind/config';

import type { ImageMetadata } from 'astro';

const { screens, spacing } = tailwindConfig.theme;

// Note that only the first three are currently in use
export type ImageLayoutOption =
	| 'medium'
	| 'wide'
	| 'full'
	| 'half'
	| 'half-wide'
	| 'half-full'
	| 'third'
	| 'third-wide'
	| 'third-full';

type ImageOrientation = 'landscape' | 'portrait' | 'square';

// These are the widths we're building for in almost all scenarios
const imageSrcsetWidthsDefault = [450, 600, 900, 1200, 1800, 2400, 3600];

// A simple check for image orientation
const getImageOrientation = ({ height, width }: ImageMetadata): ImageOrientation => {
	if (height === width) return 'square';
	if (height > width) return 'portrait';
	return 'landscape';
};

// Simple utility to remove any widths over the size of the original image
// This also adds the original max width and returns only unique values
// Without this it's easy to end up with a bunch of non-usable widths polluting the markup
export const getImageSrcsetWidths = ({
	maxWidth,
	widths = imageSrcsetWidthsDefault,
}: {
	maxWidth: number;
	widths?: number[];
}) => [...new Set([...widths, maxWidth])].filter((width) => width <= maxWidth);

// Currently we have no way to know the sizing of images in figure groups
// Astro processes MDX from inside to out, meaning figures are interpreted first
// Therefore we can't pass something from the surrounding tag without writing another remark plugin
// This creates a blind spot for specifying sizes attributes
// One solution would be to explicitly require layout props in grouped images
// But this would require a lot of rework to existing content, so maybe later
export const getImageLayoutProps = ({
	imageMetadata,
	layout,
}: {
	imageMetadata: ImageMetadata;
	layout?: ImageLayoutOption | undefined;
}) => {
	const imageOrientation = getImageOrientation(imageMetadata);

	switch (layout) {
		case 'medium': {
			return {
				width: 900,
				height: 600,
				widths: getImageSrcsetWidths({ maxWidth: imageMetadata.width }),
				sizes: `(max-width: ${screens.sm}) 100vw, (max-width: ${screens.md}) calc(100vw - 32px), (max-width: ${spacing.content}) calc(100vw - 64px), ${spacing.content}`,
			};
		}
		case 'wide': {
			return {
				width: 1800,
				height: 1200,
				widths: getImageSrcsetWidths({ maxWidth: imageMetadata.width }),
				sizes: `calc(100vw - 64px)`,
			};
		}
		case 'full': {
			return {
				width: 1800,
				height: 1200,
				widths: getImageSrcsetWidths({ maxWidth: imageMetadata.width }),
				sizes: '100vw',
			};
		}
		// No layout prop; typically seen in images in groups, so we have to guess...
		// TODO: complete additional sizes estimates for the other layout types
		default: {
			return {
				...(() => {
					switch (imageOrientation) {
						case 'portrait': {
							return { width: 600, height: 900 };
						}
						case 'square': {
							return { width: 600, height: 600 };
						}
						default: {
							return { width: 900, height: 600 };
						}
					}
				})(),
				widths: getImageSrcsetWidths({ maxWidth: imageMetadata.width }),
				sizes: `(max-width: ${screens.sm}) 100vw, (max-width: ${spacing.content}) 50vw`,
			};
		}
	}
};
