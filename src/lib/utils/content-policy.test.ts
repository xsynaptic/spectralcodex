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
		description: 'Authored description',
		hideGeometry: true,
		override,
		regions: [{ id: 'taipei' }],
		title: 'Authored title',
		title_zh: '真名',
	});
}

describe('getEffectiveLocationData', () => {
	test('applies every override field except the id when overrides apply', async () => {
		const { getEffectiveLocationData } = await loadContentPolicy(false);

		const data = getEffectiveLocationData(
			makeOverriddenLocation({
				description: 'Override description',
				id: 'anonymous',
				regions: [{ id: 'tainan' }],
				title: 'Override title',
				title_zh: '假名',
			}).data,
		);

		expect(data).toMatchObject({
			description: 'Override description',
			regions: [{ id: 'tainan' }],
			title: 'Override title',
			title_zh: '假名',
		});
		expect(data.override?.id).toBe('anonymous');
	});

	test('keeps the authored title and regions when the override omits them', async () => {
		const { getEffectiveLocationData } = await loadContentPolicy(false);

		const data = getEffectiveLocationData(
			makeOverriddenLocation({ description: 'Override description' }).data,
		);

		expect(data).toMatchObject({
			description: 'Override description',
			regions: [{ id: 'taipei' }],
			title: 'Authored title',
			title_zh: '真名',
		});
	});

	test('returns the authored data untouched in development', async () => {
		const { getEffectiveLocationData } = await loadContentPolicy(true);

		const authored = makeOverriddenLocation({ title: 'Override title' }).data;

		expect(getEffectiveLocationData(authored)).toBe(authored);
	});
});
