import { describe, expect, test } from 'vitest';

import { getPublicId } from '#entries.ts';

describe('getPublicId', () => {
	test('returns the entry id when there is no override', () => {
		expect(getPublicId({ data: {}, id: 'real-place' })).toBe('real-place');
	});

	test('returns the override id for an anonymized entry', () => {
		expect(getPublicId({ data: { override: { id: 'anon-42' } }, id: 'real-place' })).toBe(
			'anon-42',
		);
	});
});
