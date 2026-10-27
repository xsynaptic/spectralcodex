import type { MapSourceItem } from '@spectralcodex/map-codec';

import { selectMapRows } from '@spectralcodex/map-codec';

import type { PositionedPoint } from '#lib/clusters-factory.ts';

import { getPositionedPoint } from '#lib/clusters-factory.ts';

export function getTargetPoints(
	items: ReadonlyArray<MapSourceItem>,
	targetIds: ReadonlyArray<string>,
): Array<PositionedPoint> {
	return selectMapRows(items, { ids: [...targetIds], type: 'ids' }).map(getPositionedPoint);
}
