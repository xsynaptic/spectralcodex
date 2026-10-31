import type { MapPopupItem, MapSourceItem } from '#schemas/codec.ts';

import { mapPopupKeys } from '#codec-tables.ts';
import { assignChunks } from '#directory/map-chunks.ts';
import { getMapPayloadId, mapPayloadName } from '#map-payloads.ts';
import { encodeMapDirectory, encodeMapPopupData } from '#schemas/codec.ts';

interface MapDirectoryInput {
	popupData: ReadonlyArray<MapPopupItem>;
	prefix: string;
	sourceData: ReadonlyArray<MapSourceItem>;
}

export function buildMapDirectory({ popupData, prefix, sourceData }: MapDirectoryInput) {
	const popupById = new Map(
		encodeMapPopupData(popupData).map((popupItem) => [popupItem[mapPopupKeys.id], popupItem]),
	);

	const chunkInputs = sourceData.map((sourceItem) => {
		const id = sourceItem.properties.id;
		const [lng, lat] = sourceItem.geometry.coordinates;
		const popupItem = popupById.get(id);
		const popupBytes = popupItem ? Buffer.byteLength(JSON.stringify(popupItem)) : 0;

		return { id, lat, lng, popupBytes };
	});

	const { chunkIds, chunkKeyById } = assignChunks(chunkInputs);

	const directory = sourceData.map((sourceItem) => {
		const chunkKey = chunkKeyById.get(sourceItem.properties.id) ?? '0';

		return {
			...sourceItem,
			properties: { ...sourceItem.properties, chunkKey },
		} satisfies MapSourceItem;
	});

	const payloads = new Map([
		[
			getMapPayloadId(prefix, mapPayloadName.directory),
			JSON.stringify(encodeMapDirectory(directory)),
		],
	]);

	for (const [chunkKey, ids] of chunkIds) {
		const popupItems = ids
			.map((id) => popupById.get(id))
			.filter((popupItem) => popupItem !== undefined);

		payloads.set(getMapPayloadId(prefix, chunkKey), JSON.stringify(popupItems));
	}

	return { directory, payloads };
}
