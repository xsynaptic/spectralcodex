import { describe, expect, test } from 'vitest';

import { buildActivityGraph, getActivityLevel } from '#lib/utils/activity-graph.ts';

describe('getActivityLevel', () => {
	test('returns 0 for a day with no events', () => {
		expect(getActivityLevel(0, 5)).toBe(0);
	});

	test('returns 0 when the year has no events (max 0)', () => {
		expect(getActivityLevel(3, 0)).toBe(0);
	});

	test('a lone event in a quiet year is the busiest day', () => {
		expect(getActivityLevel(1, 1)).toBe(4);
	});

	test('the busiest day is always level 4', () => {
		expect(getActivityLevel(4, 4)).toBe(4);
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
		const graph = buildActivityGraph({ year: '2023', values: {}, referenceDate });

		expect(graph.days).toHaveLength(365);
	});

	test('emits a cell for every day of a leap year', () => {
		const graph = buildActivityGraph({ year: '2024', values: {}, referenceDate });

		expect(graph.days).toHaveLength(366);
	});

	test('pads to the weekday of January 1 (Sunday-start)', () => {
		// 2023-01-01 is a Sunday -> no pad; 2024-01-01 is a Monday -> one pad
		expect(buildActivityGraph({ year: '2023', values: {}, referenceDate }).padCount).toBe(0);
		expect(buildActivityGraph({ year: '2024', values: {}, referenceDate }).padCount).toBe(1);
	});

	test('places each month label at the week where it begins', () => {
		const graph = buildActivityGraph({ year: '2023', values: {}, referenceDate });

		const january = graph.monthLabels[0];
		const december = graph.monthLabels[11];

		expect(january).toMatchObject({ name: 'Jan', week: 1 });
		expect(december?.name).toBe('Dec');
	});

	test('levels a day relative to the busiest day of the year', () => {
		const graph = buildActivityGraph({
			year: '2023',
			values: { '2023-03-10': 4, '2023-03-11': 1 },
			referenceDate,
		});

		const busiest = graph.days.find((day) => day.value === 4);
		const quiet = graph.days.find((day) => day.value === 1);

		expect(busiest?.level).toBe(4);
		expect(quiet?.level).toBeGreaterThanOrEqual(1);
		expect(quiet?.level).toBeLessThan(busiest?.level ?? 0);
	});

	test('marks days after the reference date as future with no level', () => {
		const graph = buildActivityGraph({
			year: '2023',
			// A recorded value on a future day must not light up
			values: { '2023-07-01': 5 },
			referenceDate: new Date('2023-06-15T00:00:00Z'),
		});

		const futureDay = graph.days.find((day) => day.date.getUTCMonth() === 6);
		const pastDay = graph.days.find((day) => day.date.getUTCMonth() === 0);

		expect(futureDay?.future).toBe(true);
		expect(futureDay?.level).toBe(0);
		expect(pastDay?.future).toBe(false);
	});
});
