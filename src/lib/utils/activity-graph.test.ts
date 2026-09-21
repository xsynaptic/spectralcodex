import { describe, expect, test } from 'vitest';

import { buildActivityGraph, getActivityLevel } from '#lib/utils/activity-graph.ts';

describe('getActivityLevel', () => {
	test('returns 0 for a day with no events', () => {
		expect(getActivityLevel(0, 5)).toBe(0);
	});

	test('returns 0 when the year has no events (max 0)', () => {
		expect(getActivityLevel(3, 0)).toBe(0);
	});

	test('the busiest day is always level 4', () => {
		expect(getActivityLevel(1, 1)).toBe(4);
		expect(getActivityLevel(100, 100)).toBe(4);
	});

	test('log scale keeps mid-range days visible when one day is an outlier', () => {
		// Linear-to-max would flatten both to level 1 (1/100 and 10/100)
		expect(getActivityLevel(1, 100)).toBe(1);
		expect(getActivityLevel(10, 100)).toBeGreaterThanOrEqual(2);
	});

	test('is monotonic in the count', () => {
		let previous = 0;

		for (const count of [1, 5, 15, 30, 50]) {
			const level = getActivityLevel(count, 50);
			expect(level).toBeGreaterThanOrEqual(previous);
			previous = level;
		}
	});
});

describe('buildActivityGraph', () => {
	// A late reference date so no day of 2023 counts as future
	const referenceDate = new Date('2099-01-01T00:00:00Z');

	test('emits one cell per day of the year', () => {
		const graph = buildActivityGraph({ referenceDate, values: {}, year: '2023' });

		expect(graph.days).toHaveLength(365);
	});

	test('emits a cell for every day of a leap year', () => {
		const graph = buildActivityGraph({ referenceDate, values: {}, year: '2024' });

		expect(graph.days).toHaveLength(366);
	});

	test('pads to the weekday of January 1 (Sunday-start)', () => {
		// 2023-01-01 is a Sunday -> no pad; 2024-01-01 is a Monday -> one pad
		expect(buildActivityGraph({ referenceDate, values: {}, year: '2023' }).padCount).toBe(0);
		expect(buildActivityGraph({ referenceDate, values: {}, year: '2024' }).padCount).toBe(1);
	});

	test('places each month label at the week where it begins', () => {
		const graph = buildActivityGraph({ referenceDate, values: {}, year: '2023' });

		const january = graph.monthLabels[0];
		const december = graph.monthLabels[11];

		expect(january).toMatchObject({ name: 'Jan', week: 1 });
		expect(december?.name).toBe('Dec');
	});

	test('counts the weeks the grid needs, pads included', () => {
		// 2023 starts on a Sunday: 365 days over 53 week columns; 2024 adds a pad cell
		expect(buildActivityGraph({ referenceDate, values: {}, year: '2023' }).weekCount).toBe(53);
		expect(buildActivityGraph({ referenceDate, values: {}, year: '2024' }).weekCount).toBe(53);
	});

	test('a later month label sits at its own week line', () => {
		const graph = buildActivityGraph({ referenceDate, values: {}, year: '2023' });

		// 2023-12-01 is day 334 of a year with no pad, so it opens week 48
		expect(graph.monthLabels[11]).toMatchObject({ name: 'Dec', week: 48 });
	});

	test('the reference day is not future, and future days take no level', () => {
		const graph = buildActivityGraph({
			referenceDate: new Date('2023-06-15T12:00:00Z'),
			values: { '2023-01-05': 5, '2023-06-20': 100 },
			year: '2023',
		});

		const dayFor = (iso: string) =>
			graph.days.find((day) => day.date.toISOString().startsWith(iso))!;

		expect(dayFor('2023-06-15').future).toBe(false);
		expect(dayFor('2023-06-16').future).toBe(true);

		// The future day holds the year's biggest count, so it would set the scale if it were eligible
		expect(dayFor('2023-06-20')).toMatchObject({ level: 0, value: 100 });
		expect(dayFor('2023-01-05').level).toBe(4);
	});

	test('levels a day relative to the busiest day of the year', () => {
		const graph = buildActivityGraph({
			referenceDate,
			values: { '2023-03-10': 4, '2023-03-11': 1 },
			year: '2023',
		});

		const busiest = graph.days.find((day) => day.value === 4);
		const quiet = graph.days.find((day) => day.value === 1);

		expect(busiest?.level).toBe(4);
		expect(quiet?.level).toBeGreaterThanOrEqual(1);
		expect(quiet?.level).toBeLessThan(busiest?.level ?? 0);
	});
});
