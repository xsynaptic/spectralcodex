import type { MapPopupItem, MapSourceItem } from '@spectralcodex/map-codec';

import { describe, expect, test } from 'vitest';

import { hashMapDirectoryData } from '#lib/map/map-directory.ts';

function makeSourceItem(id: string): MapSourceItem {
	return {
		properties: { id, title: id, category: 'other', chunkKey: '0' },
		geometry: { type: 'Point', coordinates: [100, 10] },
	} as unknown as MapSourceItem;
}

function makePopupItem(id: string, title: string): MapPopupItem {
	return { id, title };
}

function makeChunks(title: string): Map<string, Array<MapPopupItem>> {
	return new Map([['0', [makePopupItem('alpha', title)]]]);
}

describe('hashMapDirectoryData', () => {
	test('is stable across calls with equal input', () => {
		const first = hashMapDirectoryData([makeSourceItem('alpha')], makeChunks('Alpha'));
		const second = hashMapDirectoryData([makeSourceItem('alpha')], makeChunks('Alpha'));

		expect(first).toBe(second);
	});

	test('changes when a directory row changes', () => {
		const before = hashMapDirectoryData([makeSourceItem('alpha')], makeChunks('Alpha'));
		const after = hashMapDirectoryData([makeSourceItem('beta')], makeChunks('Alpha'));

		expect(after).not.toBe(before);
	});

	test('changes when only a popup chunk changes', () => {
		const before = hashMapDirectoryData([makeSourceItem('alpha')], makeChunks('Alpha'));
		const after = hashMapDirectoryData([makeSourceItem('alpha')], makeChunks('Alpha Renamed'));

		expect(after).not.toBe(before);
	});
});
