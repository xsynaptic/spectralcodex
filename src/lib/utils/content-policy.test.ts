import type { CollectionEntry } from 'astro:content';

import { afterEach, describe, expect, test, vi } from 'vitest';

async function loadPolicy(isDev: boolean) {
	vi.stubEnv('DEV', isDev);
	vi.resetModules();

	const { collectHiddenLocationIds } = await import('#lib/utils/content-policy.ts');

	return collectHiddenLocationIds;
}

function makeLocation(id: string, isSensitive = false): CollectionEntry<'locations'> {
	return {
		collection: 'locations',
		data: { title: id, ...(isSensitive ? { hideLocation: true } : {}) },
		id,
	} as unknown as CollectionEntry<'locations'>;
}

afterEach(() => {
	vi.unstubAllEnvs();
	vi.resetModules();
});

describe('collectHiddenLocationIds', () => {
	test('gathers hidden locations outside development', async () => {
		const collectHiddenLocationIds = await loadPolicy(false);

		expect(
			collectHiddenLocationIds([makeLocation('temple'), makeLocation('bunker', true)]),
		).toEqual(new Set(['bunker']));
	});

	test('gathers nothing in development', async () => {
		const collectHiddenLocationIds = await loadPolicy(true);

		expect(
			collectHiddenLocationIds([makeLocation('temple'), makeLocation('bunker', true)]),
		).toEqual(new Set());
	});
});
