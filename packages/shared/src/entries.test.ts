import { describe, expect, test } from 'vitest';

import { applyLocationOverride, getPublicId } from '#entries.ts';

describe('getPublicId', () => {
	test('returns the override id for an anonymized entry and the entry id otherwise', () => {
		expect(getPublicId({ data: {}, id: 'real-place' })).toBe('real-place');
		expect(getPublicId({ data: { override: { id: 'anon-42' } }, id: 'real-place' })).toBe(
			'anon-42',
		);
	});
});

describe('applyLocationOverride', () => {
	test('applies every override field except the id, keeping the authored fields it omits', () => {
		const data = applyLocationOverride({
			description: 'Authored description',
			override: {
				description: 'Override description',
				id: 'anonymous',
				regions: [{ id: 'tainan' }],
				title: 'Override title',
			},
			regions: [{ id: 'taipei' }],
			title: 'Authored title',
			title_zh: '真名',
		});

		expect(data).toMatchObject({
			description: 'Override description',
			regions: [{ id: 'tainan' }],
			title: 'Override title',
			title_zh: '真名',
		});
		expect(data).not.toHaveProperty('id');
		expect(data.override.id).toBe('anonymous');
	});
});
