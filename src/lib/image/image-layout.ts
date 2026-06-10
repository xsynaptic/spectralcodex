import type { ImageContext, ImageLayout, ImageOrientation } from '#lib/image/image-types.ts';

import {
	TAILWIND_BREAKPOINT_CONTENT,
	TAILWIND_BREAKPOINT_MD,
	TAILWIND_BREAKPOINT_SM,
	TAILWIND_CONTENT_PADDING_MD,
	TAILWIND_CONTENT_PADDING_SM,
} from '#constants.ts';
import {
	ImageContextEnum,
	ImageOrientationEnum,
	ImageSizeEnum,
	ImageLayoutEnum,
} from '#lib/image/image-types.ts';

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

export function getImageInferredWidth({
	width,
	height,
	layout,
	context = ImageContextEnum.Single,
}: {
	width: number;
	height?: number | undefined;
	layout?: ImageLayout | undefined;
	context?: ImageContext | undefined;
}) {
	// Images inside a group fill a cell or slide, so size them by orientation rather than layout
	if (context !== ImageContextEnum.Single) {
		switch (getImageOrientation({ width, height })) {
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

	switch (layout) {
		case ImageLayoutEnum.Wide:
		case ImageLayoutEnum.Full: {
			return { width: ImageSizeEnum.ExtraLarge, height: ImageSizeEnum.Large };
		}
		default: {
			return { width: ImageSizeEnum.Large, height: ImageSizeEnum.Medium };
		}
	}
}

export function getImageLayoutSizesProp(
	layout?: ImageLayout,
	priority?: boolean,
	context: ImageContext = ImageContextEnum.Single,
) {
	let sizes: Array<string> = [];

	// Grouped images defer their width to the container, so they only get the `auto` hint below
	if (context === ImageContextEnum.Single) {
		switch (layout) {
			case ImageLayoutEnum.Wide: {
				sizes = [`calc(100vw - ${TAILWIND_CONTENT_PADDING_MD})`];
				break;
			}
			case ImageLayoutEnum.Full: {
				sizes = ['100vw'];
				break;
			}
			default: {
				sizes = [
					`(max-width: ${TAILWIND_BREAKPOINT_SM}) 100vw`,
					`(max-width: ${TAILWIND_BREAKPOINT_MD}) calc(100vw - ${TAILWIND_CONTENT_PADDING_SM})`,
					`(max-width: ${TAILWIND_BREAKPOINT_CONTENT}) calc(100vw - ${TAILWIND_CONTENT_PADDING_MD})`,
					`calc(${TAILWIND_BREAKPOINT_CONTENT} - ${TAILWIND_CONTENT_PADDING_MD})`,
				];
				break;
			}
		}
	}

	if (!priority) sizes.unshift('auto');

	return sizes.join(', ');
}
