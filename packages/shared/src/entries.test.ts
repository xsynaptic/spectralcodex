import { describe, expect, test } from 'vitest';

import { applyLocationOverride, getPublicId } from '#entries.ts';

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

describe('applyLocationOverride', () => {
	const authored = {
		description: 'Authored description',
		regions: [{ id: 'taipei' }],
		title: 'Authored title',
		title_zh: '真名',
	};

	test('applies every override field except the id', () => {
		const data = applyLocationOverride({
			...authored,
			override: {
				description: 'Override description',
				id: 'anonymous',
				regions: [{ id: 'tainan' }],
				title: 'Override title',
				title_zh: '假名',
			},
		});

		expect(data).toMatchObject({
			description: 'Override description',
			regions: [{ id: 'tainan' }],
			title: 'Override title',
			title_zh: '假名',
		});
		expect(data).not.toHaveProperty('id');
		expect(data.override.id).toBe('anonymous');
	});

	test('keeps the authored fields the override omits', () => {
		const data = applyLocationOverride({
			...authored,
			override: { description: 'Override description' },
		});

		expect(data).toMatchObject({ ...authored, description: 'Override description' });
	});
});
