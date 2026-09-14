import type { ImageContext, ImageLayout, ImageOrientation } from '#lib/image/image-types.ts';

import {
	tailwindBreakpointContent,
	tailwindBreakpointMd,
	tailwindBreakpointSm,
	tailwindContentPaddingMd,
	tailwindContentPaddingSm,
} from '#constants.ts';
import {
	ImageContextEnum,
	ImageLayoutEnum,
	ImageOrientationEnum,
	ImageSizeEnum,
} from '#lib/image/image-types.ts';

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
	context?: ImageContext | undefined;
	height?: number | undefined;
	layout?: ImageLayout | undefined;
	width: number;
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
		case ImageLayoutEnum.Full:
		case ImageLayoutEnum.Wide: {
			return { width: ImageSizeEnum.ExtraLarge, height: ImageSizeEnum.Large };
		}
		default: {
			return { width: ImageSizeEnum.Large, height: ImageSizeEnum.Medium };
		}
	}
}

export function getImageLayoutSizesProp(
	layout?: ImageLayout,
	isPriority?: boolean,
	context: ImageContext = ImageContextEnum.Single,
) {
	let sizes: Array<string> = [];

	// Grouped images defer their width to the container, so they only get the `auto` hint below
	if (context === ImageContextEnum.Single) {
		switch (layout) {
			case ImageLayoutEnum.Full: {
				sizes = ['100vw'];
				break;
			}
			case ImageLayoutEnum.Wide: {
				sizes = [`calc(100vw - ${tailwindContentPaddingMd})`];
				break;
			}
			default: {
				sizes = [
					`(max-width: ${tailwindBreakpointSm}) 100vw`,
					`(max-width: ${tailwindBreakpointMd}) calc(100vw - ${tailwindContentPaddingSm})`,
					`(max-width: ${tailwindBreakpointContent}) calc(100vw - ${tailwindContentPaddingMd})`,
					`calc(${tailwindBreakpointContent} - ${tailwindContentPaddingMd})`,
				];
				break;
			}
		}
	}

	if (!isPriority) sizes.unshift('auto');

	return sizes.join(', ');
}

// A simple check for image orientation
function getImageOrientation({
	width,
	height,
}: {
	height?: number | undefined;
	width: number;
}): ImageOrientation {
	if (height === width) {
		return ImageOrientationEnum.Square;
	}
	if (height && height > width) {
		return ImageOrientationEnum.Portrait;
	}
	return ImageOrientationEnum.Landscape;
}
