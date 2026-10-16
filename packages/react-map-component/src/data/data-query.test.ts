import { describe, expect, test } from 'vitest';

import { getPayloadUrl } from '#data/data-query.ts';

describe('getPayloadUrl', () => {
	test('a Chunk resolves beside its directory and keeps its version', () => {
		expect(getPayloadUrl('/api/map/map-directory.json?v=abc', '3')).toBe('/api/map/3.json?v=abc');
		expect(getPayloadUrl('/api/map/objectives/map-directory.json?v=abc', '0')).toBe(
			'/api/map/objectives/0.json?v=abc',
		);
	});
});
