import type { MapSourceItem } from '@spectralcodex/map-codec';

import { distance } from 'geokdbush';

import type { CatalogItem } from '#lib/catalog/catalog-types.ts';

interface MapBacklinkContext {
	backlinksOf: (id: string) => ReadonlyArray<Pick<CatalogItem, 'collection' | 'id'>>;
	distanceLimit: number;
	firstRowIdByEntryId: ReadonlyMap<string, string>;
}

export function getMapBacklinksByRowId(
	directory: ReadonlyArray<MapSourceItem>,
	{ backlinksOf, distanceLimit, firstRowIdByEntryId }: MapBacklinkContext,
) {
	const coordinatesById = new Map(
		directory.map(({ geometry, properties }) => [properties.id, geometry.coordinates]),
	);
	const backlinksByRowId = new Map<string, Array<string>>();

	function isNearby(rowId: string, otherRowId: string) {
		const coordinates = coordinatesById.get(rowId);
		const otherCoordinates = coordinatesById.get(otherRowId);

		if (!coordinates || !otherCoordinates || rowId === otherRowId) return false;

		return distance(...coordinates, ...otherCoordinates) <= distanceLimit;
	}

	for (const [entryId, rowId] of firstRowIdByEntryId) {
		const backlinkRowIds = backlinksOf(entryId)
			.filter(({ collection }) => collection === 'locations')
			.map(({ id }) => firstRowIdByEntryId.get(id))
			.filter((backlinkRowId) => backlinkRowId !== undefined)
			.filter((backlinkRowId) => isNearby(rowId, backlinkRowId));

		if (backlinkRowIds.length > 0) backlinksByRowId.set(rowId, backlinkRowIds);
	}

	return backlinksByRowId;
}
