import { describe, expect, test } from 'vitest';

import {
	getInitialViewState,
	readSavedViewport,
	writeSavedViewport,
} from '#canvas/canvas-viewport.ts';

const minuteMs = 60 * 1000;
const savedAt = 1_000_000;
const viewport = { latitude: 23.5, longitude: 121, zoom: 9 };

function createStorage(entries: Record<string, string> = {}) {
	const items = new Map(Object.entries(entries));

	return {
		getItem: (key: string) => items.get(key),
		items,
		setItem: (key: string, value: string) => {
			items.set(key, value);
		},
	};
}

function createSavedStorage() {
	const storage = createStorage();

	writeSavedViewport('atlas', viewport, { now: () => savedAt, storage });

	return storage;
}

const blockedStorage = {
	getItem: () => {
		throw new Error('blocked');
	},
	setItem: () => {
		throw new Error('blocked');
	},
};

describe('readSavedViewport', () => {
	test('returns a viewport saved under the same map id', () => {
		const storage = createSavedStorage();

		expect(readSavedViewport('atlas', { now: () => savedAt + minuteMs, storage })).toEqual(
			viewport,
		);
		expect(readSavedViewport('objectives', { now: () => savedAt, storage })).toBeUndefined();
	});

	test('keeps a viewport for two hours and no longer', () => {
		const storage = createSavedStorage();

		expect(readSavedViewport('atlas', { now: () => savedAt + 120 * minuteMs, storage })).toEqual(
			viewport,
		);
		expect(
			readSavedViewport('atlas', { now: () => savedAt + 120 * minuteMs + 1, storage }),
		).toBeUndefined();
	});

	test('drops an entry that is not a saved viewport', () => {
		const [key] = createSavedStorage().items.keys();

		if (!key) throw new Error('Nothing was saved');

		for (const value of ['{', '"text"', JSON.stringify({ ...viewport, timestamp: 'now' })]) {
			const storage = createStorage({ [key]: value });

			expect(readSavedViewport('atlas', { now: () => savedAt, storage })).toBeUndefined();
		}
	});

	test('reads nothing without a map id', () => {
		expect(readSavedViewport(undefined, { storage: blockedStorage })).toBeUndefined();
	});
});

describe('writeSavedViewport', () => {
	test('ignores storage that throws', () => {
		expect(() => {
			writeSavedViewport('atlas', viewport, { storage: blockedStorage });
		}).not.toThrow();
	});
});

describe('getInitialViewState', () => {
	const bounds: [number, number, number, number] = [120, 22, 122, 25];
	const maxBounds: [number, number, number, number] = [118, 20, 124, 27];

	test('prefers a saved viewport over bounds, and keeps the limits', () => {
		const storage = createSavedStorage();

		expect(
			getInitialViewState({ bounds, mapId: 'atlas', maxBounds }, { now: () => savedAt, storage }),
		).toEqual({ ...viewport, maxBounds });
	});

	test('falls back to bounds, then to the centre, when storage throws', () => {
		const store = { storage: blockedStorage };

		expect(getInitialViewState({ bounds, mapId: 'atlas' }, store)).toMatchObject({ bounds });
		expect(getInitialViewState({ center: [121, 23.5], mapId: 'atlas' }, store)).toMatchObject({
			latitude: 23.5,
			longitude: 121,
		});
	});
});
