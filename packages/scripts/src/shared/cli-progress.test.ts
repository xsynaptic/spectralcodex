import { describe, expect, test } from 'vitest';

import { createRateWindow, formatProgressText } from '#shared/cli-progress.ts';

describe('createRateWindow', () => {
	test('has no rate until two samples are apart in time', () => {
		const rateWindow = createRateWindow();

		rateWindow.add(0, 1000);

		expect(rateWindow.perSecond()).toBeUndefined();
	});

	test('forgets an early cached burst once it leaves the window', () => {
		const rateWindow = createRateWindow(10_000);

		rateWindow.add(0, 0);
		rateWindow.add(1000, 1000);
		rateWindow.add(1010, 12_000);
		rateWindow.add(1020, 13_000);

		expect(rateWindow.perSecond()).toBe(10);
	});
});

describe('formatProgressText', () => {
	test('shows counts, percent, rate and time left', () => {
		expect(
			formatProgressText({ done: 51_160, label: 'Encoding', perSecond: 280, total: 66_647 }),
		).toBe('Encoding 51,160 / 66,647 (76%) · 280/s · ~55.3s left');
	});

	test('leaves out rate and time left before a rate exists', () => {
		expect(formatProgressText({ done: 0, label: 'Encoding', total: 10 })).toBe(
			'Encoding 0 / 10 (0%)',
		);
	});

	test('treats an empty run as complete', () => {
		expect(formatProgressText({ done: 0, label: 'Checking', perSecond: 0, total: 0 })).toBe(
			'Checking 0 / 0 (100%)',
		);
	});

	test('drops time left once done, keeping the rate and note', () => {
		expect(
			formatProgressText({
				done: 40,
				label: 'Embedding',
				note: '30 cached, 10 generated',
				perSecond: 2.5,
				total: 40,
			}),
		).toBe('Embedding 40 / 40 (100%) · 2.5/s · 30 cached, 10 generated');
	});

	test('switches to minutes for long waits', () => {
		expect(formatProgressText({ done: 0, label: 'Encoding', perSecond: 1, total: 125 })).toBe(
			'Encoding 0 / 125 (0%) · 1.0/s · ~2m 05s left',
		);
	});
});
