import type { MapSourceItem } from '@spectralcodex/map-codec';

import { selectMapRows } from '@spectralcodex/map-codec';

import type { PositionedPoint } from '#canvas/canvas-positions-factory.ts';

import { getPositionedPoint } from '#canvas/canvas-positions-factory.ts';

export function getTargetPoints(
	items: ReadonlyArray<MapSourceItem>,
	targetIds: ReadonlyArray<string>,
): Array<PositionedPoint> {
	return selectMapRows(items, { ids: [...targetIds], type: 'ids' }).map(getPositionedPoint);
}
