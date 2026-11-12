import { describe, expect, test } from 'vitest';

import { getFittedText } from '#og-image/templates/shared.tsx';

const title = 'Former Taiwan Sugar Corporation Narrow-Gauge Locomotive Workshops, Sidings at Huwei';

describe('getFittedText', () => {
	test('keeps text that fits', () => {
		expect(getFittedText(title, ['Former Taiwan Sugar Corporation', 'Narrow-Gauge'])).toBe(title);
	});

	test('drops the space Takumi keeps before the ellipsis', () => {
		expect(
			getFittedText(title, ['Former Taiwan Sugar Corporation Narrow-Gauge', 'Locomotive ', '…']),
		).toBe('Former Taiwan Sugar Corporation Narrow-Gauge Locomotive…');
	});

	test('drops a trailing separator', () => {
		expect(
			getFittedText(title, [
				'Former Taiwan Sugar Corporation Narrow-Gauge',
				'Locomotive Workshops,',
				'…',
			]),
		).toBe('Former Taiwan Sugar Corporation Narrow-Gauge Locomotive Workshops…');
	});

	test('rejoins a line broken at a hyphen without adding a space', () => {
		expect(getFittedText(title, ['Former Taiwan Sugar Corporation Narrow-', 'Gauge', '…'])).toBe(
			'Former Taiwan Sugar Corporation Narrow-Gauge…',
		);
	});

	test('backs off a word cut in the middle', () => {
		expect(
			getFittedText(title, [
				'Former Taiwan Sugar Corporation Narrow-Gauge',
				'Locomotive Works',
				'…',
			]),
		).toBe('Former Taiwan Sugar Corporation Narrow-Gauge Locomotive…');
	});

	test('backs off a compound cut at its hyphen', () => {
		expect(getFittedText(title, ['Former Taiwan Sugar Corporation Narrow-', '…'])).toBe(
			'Former Taiwan Sugar Corporation…',
		);
	});

	test('keeps a character cut in a script without spaces', () => {
		expect(getFittedText('臺灣糖業股份有限公司虎尾糖廠', ['臺灣糖業股份有限', '…'])).toBe(
			'臺灣糖業股份有限…',
		);
	});

	test('keeps a character cut beside a space in a script without spaces', () => {
		expect(getFittedText('臺北 糖業股份有限公司虎尾糖廠', ['臺北 糖業股份有限', '…'])).toBe(
			'臺北 糖業股份有限…',
		);
	});

	test('hangs the dots Takumi draws in a face without the ellipsis', () => {
		expect(getFittedText('วัดพระธาตุดอยสุเทพราชวรวิหาร', ['วัดพระธาตุดอย', '...'])).toBe(
			'วัดพระธาตุดอย...',
		);
	});

	test('drops an ellipsis the title already carries before the cut', () => {
		expect(
			getFittedText('Sugar Workshops at Huwei … continued at length', [
				'Sugar Workshops at Huwei …',
				'…',
			]),
		).toBe('Sugar Workshops at Huwei…');
	});

	test('leaves the text to Takumi when a line does not match it', () => {
		expect(getFittedText(title, ['Something else', '…'])).toBe(title);
	});
});
