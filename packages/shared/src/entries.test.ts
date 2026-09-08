import { describe, expect, test } from 'vitest';

import { getPublicId } from '#entries.ts';

describe('getPublicId', () => {
	test('returns the entry id when there is no override', () => {
		expect(getPublicId({ id: 'real-place', data: {} })).toBe('real-place');
	});

	test('returns the override id for an anonymized entry', () => {
		expect(getPublicId({ id: 'real-place', data: { override: { id: 'anon-42' } } })).toBe(
			'anon-42',
		);
	});
});
