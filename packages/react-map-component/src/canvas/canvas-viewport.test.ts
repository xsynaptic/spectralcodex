import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { getInitialViewState, writeSavedViewport } from '#canvas/canvas-viewport.ts';

const minuteMs = 60 * 1000;
const savedAt = 1_000_000;
const viewport = { latitude: 23.5, longitude: 121, zoom: 9 };
const bounds: [number, number, number, number] = [120, 22, 122, 25];
const maxBounds: [number, number, number, number] = [118, 20, 124, 27];

function stubStorage(entries: Record<string, string> = {}) {
	const items = new Map(Object.entries(entries));

	vi.stubGlobal('sessionStorage', {
		getItem: (key: string) => items.get(key),
		setItem: (key: string, value: string) => {
			items.set(key, value);
		},
	});

	return items;
}

function stubBlockedStorage() {
	vi.stubGlobal('sessionStorage', {
		getItem: () => {
			throw new Error('blocked');
		},
		setItem: () => {
			throw new Error('blocked');
		},
	});
}

beforeEach(() => {
	vi.useFakeTimers();
	vi.setSystemTime(savedAt);
});

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

describe('getInitialViewState', () => {
	test('prefers a viewport saved under the same map id, and keeps the limits', () => {
		stubStorage();
		writeSavedViewport('atlas', viewport);
		vi.setSystemTime(savedAt + minuteMs);

		expect(getInitialViewState({ bounds, mapId: 'atlas', maxBounds })).toEqual({
			...viewport,
			maxBounds,
		});
		expect(getInitialViewState({ bounds, mapId: 'objectives' })).toMatchObject({ bounds });
	});

	test('keeps a saved viewport for two hours and no longer', () => {
		stubStorage();
		writeSavedViewport('atlas', viewport);

		vi.setSystemTime(savedAt + 120 * minuteMs);
		expect(getInitialViewState({ bounds, mapId: 'atlas' })).toMatchObject(viewport);

		vi.setSystemTime(savedAt + 120 * minuteMs + 1);
		expect(getInitialViewState({ bounds, mapId: 'atlas' })).toMatchObject({ bounds });
	});

	test('drops an entry that is not a saved viewport', () => {
		const items = stubStorage();

		writeSavedViewport('atlas', viewport);

		const [key = ''] = items.keys();

		for (const value of ['{', '"text"', JSON.stringify({ ...viewport, timestamp: 'now' })]) {
			stubStorage({ [key]: value });

			expect(getInitialViewState({ bounds, mapId: 'atlas' })).toMatchObject({ bounds });
		}
	});

	test('ignores a write and falls back to bounds, then to the center, when storage throws', () => {
		stubBlockedStorage();

		expect(() => {
			writeSavedViewport('atlas', viewport);
		}).not.toThrow();
		expect(getInitialViewState({ bounds, mapId: 'atlas' })).toMatchObject({ bounds });
		expect(getInitialViewState({ center: [121, 23.5], mapId: 'atlas' })).toMatchObject({
			latitude: 23.5,
			longitude: 121,
		});
	});

	test('reads nothing without a map id', () => {
		stubBlockedStorage();

		expect(getInitialViewState({ bounds })).toMatchObject({ bounds });
	});
});
