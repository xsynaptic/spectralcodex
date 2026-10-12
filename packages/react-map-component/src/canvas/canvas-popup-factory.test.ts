import { describe, expect, test } from 'vitest';

import { getPopupLayout } from '#canvas/canvas-popup-factory.ts';

describe('getPopupLayout', () => {
	test('a wide map gets the full popup beside the Point', () => {
		expect(getPopupLayout(1200)).toEqual({ isNarrow: false, maxWidthPx: 350 });
	});

	test('the popup drops under the Point once the map is 640px or less', () => {
		expect(getPopupLayout(641).isNarrow).toBe(false);
		expect(getPopupLayout(640).isNarrow).toBe(true);
	});

	test('a narrow map caps the popup at 300px', () => {
		expect(getPopupLayout(600)).toEqual({ isNarrow: true, maxWidthPx: 300 });
	});

	test('the popup never takes more than four fifths of the map', () => {
		expect(getPopupLayout(320)).toEqual({ isNarrow: true, maxWidthPx: 256 });
		expect(getPopupLayout(333).maxWidthPx).toBe(266);
	});

	test('a wide popup beside a centred Point stays inside the narrowest wide map', () => {
		const containerWidth = 641;
		const easePaddingRight = 180;
		const popupOffset = 16;
		const pointX = (containerWidth - easePaddingRight) / 2;

		expect(pointX + popupOffset + getPopupLayout(containerWidth).maxWidthPx).toBeLessThanOrEqual(
			containerWidth,
		);
	});
});
