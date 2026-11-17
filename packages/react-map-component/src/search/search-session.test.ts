import { describe, expect, test } from 'vitest';

import type { MapSearchEndDetail } from '#lib/types.ts';

import { createSearchSession } from '#search/search-session.ts';

function setup() {
	const outcomes: Array<Omit<MapSearchEndDetail, 'mapId'>> = [];
	const session = createSearchSession((outcome) => {
		outcomes.push(outcome);
	});

	return { outcomes, session };
}

describe('createSearchSession', () => {
	test('reports only the query standing when the search closes', () => {
		const { outcomes, session } = setup();

		session.update('te', 0);
		session.update('temp', 0);
		session.update(' temple ', 12);
		session.end(false);

		expect(outcomes).toEqual([{ clicked: false, query: 'temple', results: 12 }]);
	});

	test('reports a search once, however many times it ends', () => {
		const { outcomes, session } = setup();

		session.update('temple', 3);
		session.end(true);
		session.end(false);

		expect(outcomes).toEqual([{ clicked: true, query: 'temple', results: 3 }]);
	});

	test('drops a pending query once the field is cleared or results are unknown', () => {
		const { outcomes, session } = setup();

		session.update('temple', 0);
		session.update('  ', 0);
		session.end(false);
		session.update('temple', 0);
		session.update('temples', undefined);
		session.end(false);

		expect(outcomes).toEqual([]);
	});
});
