import {
	TAILWIND_BREAKPOINT_CONTENT,
	TAILWIND_BREAKPOINT_MD,
	TAILWIND_BREAKPOINT_SM,
} from '#constants.ts';

// Note that only the first three are currently in use
export const ImageLayoutEnum = {
	Default: 'default',
	Wide: 'wide',
	Full: 'full',
	Half: 'half',
	HalfWide: 'half-wide',
	HalfFull: 'half-full',
	Third: 'third',
	ThirdWide: 'third-wide',
	ThirdFull: 'third-full',
	None: 'none',
} as const;

export type ImageLayout = (typeof ImageLayoutEnum)[keyof typeof ImageLayoutEnum];

const ImageOrientationEnum = {
	Landscape: 'landscape',
	Portrait: 'portrait',
	Square: 'square',
} as const;

type ImageOrientation = (typeof ImageOrientationEnum)[keyof typeof ImageOrientationEnum];

// These are the widths we're building for in almost all scenarios
const imageSrcsetWidthsDefault = [450, 600, 900, 1200, 1800, 2400, 3600];

// A simple check for image orientation
function getImageOrientation({
	width,
	height,
}: {
	width: number;
	height?: number | undefined;
}): ImageOrientation {
	if (height === width) {
		return ImageOrientationEnum.Square;
	}
	if (height && height > width) {
		return ImageOrientationEnum.Portrait;
	}
	return ImageOrientationEnum.Landscape;
}

// Simple utility to remove any widths over the size of the original image
// This also adds the original max width and returns only unique values
// Without this it's easy to end up with a bunch of non-usable widths polluting the markup
export function getImageSrcsetWidths({
	maxWidth,
	widths = imageSrcsetWidthsDefault,
}: {
	maxWidth: number;
	widths?: Array<number>;
}) {
	return [...new Set([...widths, maxWidth])].filter((width) => width <= maxWidth);
}

// Currently we have no way to know the sizing of images in figure groups
// Astro processes MDX from inside to out, meaning figures are interpreted first
// Therefore we can't pass something from the surrounding tag without writing another remark plugin
// This creates a blind spot for specifying sizes attributes
// One solution would be to explicitly require layout props in grouped images
// But this would require a lot of rework to existing content, so maybe later
export function getImageLayoutProps({
	width,
	height,
	layout,
}: {
	width: number;
	height?: number | undefined;
	layout?: ImageLayout | undefined;
}) {
	const imageOrientation = getImageOrientation({ width, height });

	switch (layout) {
		case ImageLayoutEnum.Default: {
			return {
				width: 900,
				height: 600,
				widths: getImageSrcsetWidths({ maxWidth: width }),
				sizes: `(max-width: ${TAILWIND_BREAKPOINT_SM}) 100vw, (max-width: ${TAILWIND_BREAKPOINT_MD}) calc(100vw - 32px), (max-width: ${TAILWIND_BREAKPOINT_CONTENT}) calc(100vw - 64px), ${TAILWIND_BREAKPOINT_CONTENT}`,
			};
		}
		case ImageLayoutEnum.Wide: {
			return {
				width: 1800,
				height: 1200,
				widths: getImageSrcsetWidths({ maxWidth: width }),
				sizes: `calc(100vw - 64px)`,
			};
		}
		case ImageLayoutEnum.Full: {
			return {
				width: 1800,
				height: 1200,
				widths: getImageSrcsetWidths({ maxWidth: width }),
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
				widths: getImageSrcsetWidths({ maxWidth: width }),
				sizes: `(max-width: ${TAILWIND_BREAKPOINT_SM}) 100vw, (max-width:${TAILWIND_BREAKPOINT_CONTENT}) 50vw`,
			};
		}
	}
}
