import { GeometryTypeEnum } from '@spectralcodex/shared/map';

import type {
	MapDirectoryColumns,
	MapPopupItem,
	MapPopupItemCompressed,
	MapSourceItem,
} from '#schemas/codec.ts';

import { decodeFields } from '#codec-fields.ts';
import { geometryKey, popupFields, sourceFields } from '#codec-tables.ts';
import { decodeMapRowId, getMapRowUrl } from '#map-ids.ts';

export function decodeMapDirectory(columns: MapDirectoryColumns): Array<MapSourceItem> {
	const columnsByKey = columns as Partial<Record<string, Array<unknown>>>;
	const fieldColumns = Object.entries(sourceFields).map(([name, { decode, key }]) => ({
		column: columnsByKey[key] ?? [],
		decode: decode as (value: unknown) => unknown,
		name,
	}));
	const geometryColumn = columnsByKey[geometryKey] ?? [];
	const rowCount = Object.values(columnsByKey).at(0)?.length ?? 0;
	const rows: Array<MapSourceItem> = [];

	for (let index = 0; index < rowCount; index++) {
		const properties: Record<string, unknown> = {};

		for (const { column, decode, name } of fieldColumns) {
			const value = decode(column[index] ?? undefined);

			if (value !== undefined) properties[name] = value;
		}

		const sourceProperties = properties as MapSourceItem['properties'];

		sourceProperties.id = decodeMapRowId(sourceProperties.id, sourceProperties.title);
		sourceProperties.url = getMapRowUrl(sourceProperties.id);

		rows.push({
			geometry: {
				coordinates: geometryColumn[index] as MapSourceItem['geometry']['coordinates'],
				type: GeometryTypeEnum.Point,
			},
			properties: sourceProperties,
			type: 'Feature',
		});
	}

	resolveBacklinks(rows, columnsByKey[sourceFields.backlinks.key]);

	return rows;
}

function resolveBacklinks(rows: Array<MapSourceItem>, backlinkColumn: Array<unknown> | undefined) {
	if (!backlinkColumn) return;

	for (const [index, row] of rows.entries()) {
		const indices = backlinkColumn[index] as Array<number> | null | undefined;

		if (!indices) continue;

		row.properties.backlinks = indices.map(
			(backlinkIndex) => rows[backlinkIndex]?.properties.id ?? '',
		);
	}
}

export function decodeMapPopupData(
	items: ReadonlyArray<MapPopupItemCompressed>,
): Array<MapPopupItem> {
	return items.map((item) => decodeFields(popupFields, item) as MapPopupItem);
}
