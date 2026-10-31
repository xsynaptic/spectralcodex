import { describe, expect, test } from 'vitest';

import type { MapSourceItem } from '#schemas/codec.ts';

import { mapSourceKeys } from '#codec-tables.ts';
import { hashMapPayloads } from '#directory/map-directory-hash.ts';
import { mapPayloadName } from '#map-payloads.ts';
import { encodeMapDirectory, MapDirectorySchema } from '#schemas/codec.ts';

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
