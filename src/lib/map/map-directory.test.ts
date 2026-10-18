import type { MapSourceItem } from '@spectralcodex/map-codec';

import {
	encodeMapDirectory,
	MapDirectorySchema,
	mapPayloadName,
	mapSourceKeys,
} from '@spectralcodex/map-codec';
import { describe, expect, test } from 'vitest';

import { hashMapPayloads } from '#lib/map/map-directory-hash.ts';

const sourceItem = {
	geometry: { coordinates: [100, 10], type: 'Point' },
	properties: {
		entryQuality: 1,
		hasImage: false,
		id: 'alpha',
		precision: 3,
		rating: 2,
		status: 'unknown',
		title: 'Alpha',
	},
	type: 'Feature',
} satisfies MapSourceItem;

function payloadsOf(directory: unknown) {
	return new Map([['map-directory', JSON.stringify(directory)]]);
}

describe('hashMapPayloads', () => {
	test('moves when a converter changes bytes but not decoded rows', () => {
		const before = encodeMapDirectory([sourceItem]);
		const after = { ...before, [mapSourceKeys.entryQuality]: [1] };

		expect(MapDirectorySchema.parse(after)).toEqual(MapDirectorySchema.parse(before));
		expect(hashMapPayloads(payloadsOf(after))).not.toBe(hashMapPayloads(payloadsOf(before)));
	});

	test('ignores the order payloads were collected in', () => {
		const payloads = new Map([
			['map-directory', JSON.stringify(encodeMapDirectory([sourceItem]))],
			[mapPayloadName.scopes, '[]'],
		]);

		expect(hashMapPayloads(new Map([...payloads].toReversed()))).toBe(hashMapPayloads(payloads));
	});
});
