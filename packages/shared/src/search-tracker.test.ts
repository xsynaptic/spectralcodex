import { describe, expect, test } from 'vitest';

import { createSearchTracker } from '#search-tracker.ts';

function setup() {
	const events: Array<[string, Record<string, unknown>]> = [];
	const tracker = createSearchTracker((event, data) => {
		events.push([event, data]);
	});

	return { events, tracker };
}

describe('createSearchTracker', () => {
	test('sends only the query standing when the search closes', () => {
		const { events, tracker } = setup();

		tracker.update('te', 0);
		tracker.update('temp', 0);
		tracker.update('temple', 12);
		tracker.end(false);

		expect(events).toEqual([['query', { clicked: false, query: 'temple', results: 12 }]]);
	});

	test('follows a query without results with an empty event', () => {
		const { events, tracker } = setup();

		tracker.update('xyzzy', 0);
		tracker.end(true);

		expect(events).toEqual([
			['query', { clicked: true, query: 'xyzzy', results: 0 }],
			['empty', { query: 'xyzzy' }],
		]);
	});

	test('sends a search once, however many times it ends', () => {
		const { events, tracker } = setup();

		tracker.update('temple', 3);
		tracker.end(true);
		tracker.end(false);

		expect(events).toHaveLength(1);
	});

	test('collapses whitespace and caps the query length', () => {
		const { events, tracker } = setup();

		tracker.update(`  old \n  ${'x'.repeat(200)}`, 0);
		tracker.end(false);

		expect(events[0]?.[1]).toEqual({ clicked: false, query: `old ${'x'.repeat(96)}`, results: 0 });
	});

	test('drops a pending query once the field is cleared or results are unknown', () => {
		const { events, tracker } = setup();

		tracker.update('temple', 0);
		tracker.update('t', 0);
		tracker.end(false);
		tracker.update('temple', 0);
		tracker.update('temples', undefined);
		tracker.end(false);

		expect(events).toEqual([]);
	});
});
