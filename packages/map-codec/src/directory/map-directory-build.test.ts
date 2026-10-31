import { GeometryTypeEnum, LocationStatusEnum } from '@spectralcodex/shared/map';
import { describe, expect, test } from 'vitest';
import { z } from 'zod';

import type { MapSourceItem } from '#schemas/codec.ts';

import { buildMapDirectory } from '#directory/map-directory-build.ts';
import { getMapRowUrl } from '#map-ids.ts';
import { getMapPayloadId, mapPayloadName } from '#map-payloads.ts';
import { MapDirectorySchema, MapPopupItemSchema } from '#schemas/codec.ts';

function makeSourceItem(id: string, coordinates: [number, number]): MapSourceItem {
	return {
		geometry: { coordinates, type: GeometryTypeEnum.Point },
		properties: {
			entryQuality: 1,
			hasImage: false,
			id,
			precision: 3,
			rating: 2,
			status: LocationStatusEnum.Active,
			title: id,
			url: getMapRowUrl(id),
		},
		type: 'Feature',
	};
}

describe('buildMapDirectory', () => {
	test("every row's chunkKey names a payload holding its Popup Data", () => {
		const prefix = 'objectives/';
		const sourceData = [
			makeSourceItem('alpha', [121, 25]),
			makeSourceItem('beta', [-74, 40]),
			makeSourceItem('gamma', [2, 48]),
		];
		const popupData = sourceData.map(({ properties: { id } }) => ({
			description: `About ${id}`,
			id,
			title: id,
		}));

		const { directory, payloads } = buildMapDirectory({ popupData, prefix, sourceData });
		const directoryBody = payloads.get(getMapPayloadId(prefix, mapPayloadName.directory));

		expect(MapDirectorySchema.parse(JSON.parse(directoryBody ?? 'null'))).toEqual(directory);

		for (const { properties } of directory) {
			const chunkBody = payloads.get(getMapPayloadId(prefix, properties.chunkKey));
			const chunk = z.array(MapPopupItemSchema).parse(JSON.parse(chunkBody ?? '[]'));

			expect(chunk.find((popupItem) => popupItem.id === properties.id)).toEqual(
				popupData.find((popupItem) => popupItem.id === properties.id),
			);
		}
	});
});
