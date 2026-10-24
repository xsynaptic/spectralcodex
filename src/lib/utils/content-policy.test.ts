import { afterEach, describe, expect, test, vi } from 'vitest';

import { makeEntry } from '#lib/collections/collections-test-utils.ts';

async function loadContentPolicy(isDev: boolean) {
	vi.stubEnv('DEV', isDev);
	vi.resetModules();

	return import('#lib/utils/content-policy.ts');
}

afterEach(() => {
	vi.unstubAllEnvs();
	vi.resetModules();
});

function makeOverriddenLocation(override: Record<string, unknown>) {
	return makeEntry('locations', 'real-place', {
		hideGeometry: true,
		override,
		title: 'Authored title',
	});
}

describe('getEffectiveLocationData', () => {
	test('applies the override outside development', async () => {
		const { getEffectiveLocationData } = await loadContentPolicy(false);

		const authored = makeOverriddenLocation({ title: 'Override title' }).data;

		expect(getEffectiveLocationData(authored).title).toBe('Override title');
	});

	test('returns the authored data untouched in development', async () => {
		const { getEffectiveLocationData } = await loadContentPolicy(true);

		const authored = makeOverriddenLocation({ title: 'Override title' }).data;

		expect(getEffectiveLocationData(authored)).toBe(authored);
	});
});
