import { describe, expect, test } from 'vitest';

import {
	tailwindBreakpointContent,
	tailwindContentPaddingMd,
	tailwindContentPaddingSm,
} from '#constants.ts';
import {
	getImageBreakpoints,
	getImageInferredWidth,
	getImageLayoutSizesProp,
} from '#lib/image/image-layout.ts';
import { ImageContextEnum, ImageLayoutEnum, ImageSizeEnum } from '#lib/image/image-types.ts';

describe('getImageBreakpoints', () => {
	test('keeps a width equal to the original but drops anything larger', () => {
		expect(getImageBreakpoints({ maxWidth: ImageSizeEnum.Medium })).toStrictEqual([
			ImageSizeEnum.ExtraSmall,
			ImageSizeEnum.Small,
			ImageSizeEnum.Medium,
		]);
	});

	test('an original smaller than the smallest breakpoint yields none at all', () => {
		expect(getImageBreakpoints({ maxWidth: ImageSizeEnum.ExtraSmall - 1 })).toStrictEqual([]);
	});

	test('custom widths replace the defaults and keep their given order', () => {
		expect(getImageBreakpoints({ maxWidth: 1000, widths: [800, 200, 1200] })).toStrictEqual([
			800, 200,
		]);
	});
});

describe('getImageInferredWidth', () => {
	test('a grouped image sizes by orientation, ignoring the layout entirely', () => {
		const portrait = { context: ImageContextEnum.Grid, height: 900, width: 600 };

		expect(getImageInferredWidth({ ...portrait, layout: ImageLayoutEnum.Full })).toStrictEqual(
			getImageInferredWidth(portrait),
		);
		expect(getImageInferredWidth(portrait)).toStrictEqual({
			height: ImageSizeEnum.Medium,
			width: ImageSizeEnum.Small,
		});
	});

	test('a grouped square is square, and a missing height reads as landscape', () => {
		expect(
			getImageInferredWidth({ context: ImageContextEnum.Carousel, height: 900, width: 900 }),
		).toStrictEqual({ height: ImageSizeEnum.Small, width: ImageSizeEnum.Small });
		expect(getImageInferredWidth({ context: ImageContextEnum.Carousel, width: 900 })).toStrictEqual(
			{ height: ImageSizeEnum.Small, width: ImageSizeEnum.Medium },
		);
	});

	test('a single image sizes by layout, ignoring its orientation', () => {
		const wide = { layout: ImageLayoutEnum.Wide };

		expect(getImageInferredWidth({ height: 900, width: 600, ...wide })).toStrictEqual(
			getImageInferredWidth({ height: 1000, width: 3000, ...wide }),
		);
		expect(getImageInferredWidth({ width: 600, ...wide })).toStrictEqual({
			height: ImageSizeEnum.Large,
			width: ImageSizeEnum.ExtraLarge,
		});
	});

	test('single is the default context, and an absent layout falls back to the content width', () => {
		expect(getImageInferredWidth({ height: 900, width: 600 })).toStrictEqual({
			height: ImageSizeEnum.Medium,
			width: ImageSizeEnum.Large,
		});
	});
});

const parse = (sizes: string) => sizes.split(', ');

describe('getImageLayoutSizesProp', () => {
	test('the lazy hint leads, and priority drops it so the browser sizes immediately', () => {
		expect(parse(getImageLayoutSizesProp(ImageLayoutEnum.Full)).at(0)).toBe('auto');
		expect(getImageLayoutSizesProp(ImageLayoutEnum.Full, true)).toBe('100vw');
	});

	test('the default layout ends in an unconditional width, every earlier entry conditional', () => {
		const candidates = parse(getImageLayoutSizesProp(ImageLayoutEnum.Default, true));

		expect(candidates.at(-1)).toBe(
			`calc(${tailwindBreakpointContent} - ${tailwindContentPaddingMd})`,
		);
		expect(candidates.slice(0, -1).every((candidate) => candidate.startsWith('(max-width:'))).toBe(
			true,
		);
	});

	test('narrow viewports subtract the smaller padding, wider ones the larger', () => {
		const candidates = parse(getImageLayoutSizesProp(ImageLayoutEnum.Default, true));

		expect(
			candidates.filter((candidate) => candidate.includes(tailwindContentPaddingSm)),
		).toHaveLength(1);
		expect(candidates.at(0)).toContain('100vw');
	});

	test('a wide image spans the viewport less padding; full spans all of it', () => {
		expect(getImageLayoutSizesProp(ImageLayoutEnum.Wide, true)).toBe(
			`calc(100vw - ${tailwindContentPaddingMd})`,
		);
		expect(getImageLayoutSizesProp(ImageLayoutEnum.Full, true)).toBe('100vw');
	});

	test('a grouped image defers to its container, leaving only the lazy hint', () => {
		expect(getImageLayoutSizesProp(ImageLayoutEnum.Full, false, ImageContextEnum.Grid)).toBe(
			'auto',
		);
		expect(getImageLayoutSizesProp(ImageLayoutEnum.Full, true, ImageContextEnum.Carousel)).toBe('');
	});
});
