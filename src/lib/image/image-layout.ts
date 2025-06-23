import {
	TAILWIND_BREAKPOINT_CONTENT,
	TAILWIND_BREAKPOINT_MD,
	TAILWIND_BREAKPOINT_SM,
} from '#constants.ts';

export const ImageLayoutEnum = {
	Default: 'default',
	Wide: 'wide',
	Full: 'full',
	None: 'none', // A special case for images in groups
} as const;

export type ImageLayout = (typeof ImageLayoutEnum)[keyof typeof ImageLayoutEnum];

const ImageOrientationEnum = {
	Landscape: 'landscape',
	Portrait: 'portrait',
	Square: 'square',
} as const;

type ImageOrientation = (typeof ImageOrientationEnum)[keyof typeof ImageOrientationEnum];

const ImageSizeEnum = {
	ExtraSmall: 450,
	Small: 600,
	Medium: 900,
	Large: 1200,
	ExtraLarge: 1800,
	ExtraExtraLarge: 2400,
	ExtraExtraExtraLarge: 3600,
} as const;

// These are the widths we're building for in almost all scenarios
const imageSrcsetWidthsDefault = [
	ImageSizeEnum.ExtraSmall,
	ImageSizeEnum.Small,
	ImageSizeEnum.Medium,
	ImageSizeEnum.Large,
	ImageSizeEnum.ExtraLarge,
	ImageSizeEnum.ExtraExtraLarge,
	ImageSizeEnum.ExtraExtraExtraLarge,
];

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
				width: ImageSizeEnum.Medium,
				height: ImageSizeEnum.Large,
				widths: getImageSrcsetWidths({ maxWidth: width }),
				sizes: `(max-width: ${TAILWIND_BREAKPOINT_SM}) 100vw, (max-width: ${TAILWIND_BREAKPOINT_MD}) calc(100vw - 32px), (max-width: ${TAILWIND_BREAKPOINT_CONTENT}) calc(100vw - 64px), ${TAILWIND_BREAKPOINT_CONTENT}`,
			};
		}
		case ImageLayoutEnum.Wide: {
			return {
				width: ImageSizeEnum.ExtraLarge,
				height: ImageSizeEnum.Large,
				widths: getImageSrcsetWidths({ maxWidth: width }),
				sizes: `calc(100vw - 64px)`,
			};
		}
		case ImageLayoutEnum.Full: {
			return {
				width: ImageSizeEnum.ExtraLarge,
				height: ImageSizeEnum.Large,
				widths: getImageSrcsetWidths({ maxWidth: width }),
				sizes: '100vw',
			};
		}
		// No layout prop; typically seen in images in groups
		// Ultimately we're just guessing here
		default: {
			return {
				...(() => {
					switch (imageOrientation) {
						case ImageOrientationEnum.Portrait: {
							return { width: ImageSizeEnum.Small, height: ImageSizeEnum.Medium };
						}
						case ImageOrientationEnum.Square: {
							return { width: ImageSizeEnum.Small, height: ImageSizeEnum.Small };
						}
						default: {
							return { width: ImageSizeEnum.Medium, height: ImageSizeEnum.Small };
						}
					}
				})(),
				widths: getImageSrcsetWidths({ maxWidth: width }),
				sizes: `(max-width: ${TAILWIND_BREAKPOINT_SM}) 100vw, (max-width:${TAILWIND_BREAKPOINT_CONTENT}) 50vw`,
			};
		}
	}
}
