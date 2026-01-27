import {
	TAILWIND_BREAKPOINT_CONTENT,
	TAILWIND_BREAKPOINT_MD,
	TAILWIND_BREAKPOINT_SM,
	TAILWIND_CONTENT_PADDING_MD,
	TAILWIND_CONTENT_PADDING_SM,
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

export const ImageSizeEnum = {
	ExtraSmall: 450,
	Small: 600,
	Medium: 900,
	Large: 1200,
	ExtraLarge: 1800,
	ExtraExtraLarge: 2400,
	ExtraExtraExtraLarge: 3600,
} as const;

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
export function getImageBreakpoints({
	maxWidth,
	// These are the widths we're building for in almost all scenarios
	widths = [
		ImageSizeEnum.ExtraSmall,
		ImageSizeEnum.Small,
		ImageSizeEnum.Medium,
		ImageSizeEnum.Large,
		ImageSizeEnum.ExtraLarge,
		ImageSizeEnum.ExtraExtraLarge,
		ImageSizeEnum.ExtraExtraExtraLarge,
	],
}: {
	maxWidth: number;
	widths?: Array<number>;
}) {
	return widths.filter((width) => width <= maxWidth);
}

// Infer a width from layout and orientation
// This ultimately selects which image is used for the `src` prop
export function getImageInferredWidth({
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
				width: ImageSizeEnum.Large,
				height: ImageSizeEnum.Medium,
			};
		}
		case ImageLayoutEnum.Wide: {
			return {
				width: ImageSizeEnum.ExtraLarge,
				height: ImageSizeEnum.Large,
			};
		}
		case ImageLayoutEnum.Full: {
			return {
				width: ImageSizeEnum.ExtraLarge,
				height: ImageSizeEnum.Large,
			};
		}
		// No layout prop; typically seen in images in groups
		// Ultimately we're just guessing here
		default: {
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
		}
	}
}

export function getImageLayoutSizesProp(layout?: ImageLayout) {
	switch (layout) {
		case ImageLayoutEnum.Default: {
			return [
				`(max-width: ${TAILWIND_BREAKPOINT_SM}) 100vw`,
				`(max-width: ${TAILWIND_BREAKPOINT_MD}) calc(100vw - ${TAILWIND_CONTENT_PADDING_SM})`,
				`(max-width: ${TAILWIND_BREAKPOINT_CONTENT}) calc(100vw - ${TAILWIND_CONTENT_PADDING_MD})`,
				`calc(${TAILWIND_BREAKPOINT_CONTENT} - ${TAILWIND_CONTENT_PADDING_MD})`,
			].join(', ');
		}
		case ImageLayoutEnum.Wide: {
			return `calc(100vw - ${TAILWIND_CONTENT_PADDING_MD})`;
		}
		case ImageLayoutEnum.Full: {
			return '100vw';
		}
		// No layout prop; typically seen in images in groups
		// Ultimately we're just guessing here
		default: {
			return [
				`(max-width: ${TAILWIND_BREAKPOINT_SM}) 100vw`,
				`(max-width: ${TAILWIND_BREAKPOINT_MD}) calc((100vw - ${TAILWIND_CONTENT_PADDING_SM}) / 2)`,
				`(max-width: ${TAILWIND_BREAKPOINT_CONTENT}) calc((100vw - ${TAILWIND_CONTENT_PADDING_MD}) / 2)`,
				`calc((${TAILWIND_BREAKPOINT_CONTENT} - ${TAILWIND_CONTENT_PADDING_MD}) / 2)`,
			].join(', ');
		}
	}
}
