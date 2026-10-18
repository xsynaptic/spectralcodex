import { describe, expect, test } from 'vitest';

import { getPopupLayout, popupEasePaddingPx } from '#lib/popup-layout-factory.ts';

describe('getPopupLayout', () => {
	test('the popup drops under the Point once the map is narrower than 640px', () => {
		expect(getPopupLayout(640).isNarrow).toBe(false);
		expect(getPopupLayout(639).isNarrow).toBe(true);
	});

	test('the popup never takes more than four fifths of the map', () => {
		expect(getPopupLayout(320)).toEqual({ isNarrow: true, maxWidthPx: 256 });
		expect(getPopupLayout(333).maxWidthPx).toBe(266);
	});

	test('a wide popup beside a centred Point stays inside the narrowest wide map', () => {
		const containerWidth = 640;
		const popupOffset = 16;
		const pointX = (containerWidth - popupEasePaddingPx) / 2;

		expect(pointX + popupOffset + getPopupLayout(containerWidth).maxWidthPx).toBeLessThanOrEqual(
			containerWidth,
		);
	});
});
