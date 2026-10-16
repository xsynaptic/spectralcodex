import { z } from 'zod';

import type { MapSourceItem } from '#codec.ts';

export const MapIntervalSchema = z.tuple([z.number(), z.number()]);

export const MapFeaturesRuleSchema = z.discriminatedUnion('type', [
	z.object({ ids: z.array(z.string()), type: z.literal('ids') }),
	z.object({ index: z.number(), type: z.literal('theme') }),
	z.object({ interval: MapIntervalSchema, type: z.literal('region') }),
]);

export type MapFeaturesRule = z.output<typeof MapFeaturesRuleSchema>;
export type MapInterval = z.output<typeof MapIntervalSchema>;

const rowByIdCache = new WeakMap<ReadonlyArray<MapSourceItem>, Map<string, MapSourceItem>>();

function getRowById(rows: ReadonlyArray<MapSourceItem>) {
	const cached = rowByIdCache.get(rows);

	if (cached) return cached;

	const rowById = new Map(rows.map((row) => [row.properties.id, row] as const));

	rowByIdCache.set(rows, rowById);

	return rowById;
}

export function getMapRowById(rows: ReadonlyArray<MapSourceItem>, id: string) {
	return getRowById(rows).get(id);
}

export function createRuleTest(
	rule: MapFeaturesRule,
): (properties: MapSourceItem['properties']) => boolean {
	switch (rule.type) {
		case 'ids': {
			const idSet = new Set(rule.ids);

			return (properties) => idSet.has(properties.id);
		}
		case 'region': {
			const [left, right] = rule.interval;

			return (properties) =>
				properties.regionOrdinals?.some((ordinal) => ordinal >= left && ordinal <= right) ?? false;
		}
		case 'theme': {
			return (properties) => properties.themeIndices?.includes(rule.index) ?? false;
		}
	}
}

export function selectMapRows(
	rows: ReadonlyArray<MapSourceItem>,
	rule: MapFeaturesRule,
): Array<MapSourceItem> {
	if (rule.type === 'ids') {
		const rowById = getRowById(rows);

		return rule.ids.map((id) => rowById.get(id)).filter((row) => row !== undefined);
	}

	const isInRule = createRuleTest(rule);

	return rows.filter(({ properties }) => isInRule(properties));
}
