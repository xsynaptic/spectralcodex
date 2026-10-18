import type { MapSourceItem } from '@spectralcodex/map-codec';

import {
	encodeMapSourceData,
	mapPayloadName,
	MapSourceItemSchema,
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

function payloadsOf(rows: ReadonlyArray<unknown>) {
	return new Map([['map-directory', JSON.stringify(rows)]]);
}

describe('hashMapPayloads', () => {
	test('moves when a converter changes bytes but not decoded rows', () => {
		const before = encodeMapSourceData([sourceItem]);
		const after = before.map((row) => ({ ...row, [mapSourceKeys.entryQuality]: 1 }));

		expect(after.map((row) => MapSourceItemSchema.parse(row))).toEqual(
			before.map((row) => MapSourceItemSchema.parse(row)),
		);
		expect(hashMapPayloads(payloadsOf(after))).not.toBe(hashMapPayloads(payloadsOf(before)));
	});

	test('ignores the order payloads were collected in', () => {
		const payloads = new Map([
			['map-directory', JSON.stringify(encodeMapSourceData([sourceItem]))],
			[mapPayloadName.scopes, '[]'],
		]);

		expect(hashMapPayloads(new Map([...payloads].toReversed()))).toBe(hashMapPayloads(payloads));
	});
});
