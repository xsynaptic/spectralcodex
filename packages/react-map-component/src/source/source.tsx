import type { FC } from 'react';

import { useMapCanvasData } from '#data/data-canvas.tsx';
import { useMapDivision } from '#data/data-query.ts';
import { useMapConfig } from '#lib/config.tsx';
import { MapSourceConnections } from '#source/source-connections.tsx';
import { MapSourceDivisions } from '#source/source-divisions.tsx';
import { MapSourceHover } from '#source/source-hover.tsx';
import { MapSourceLabels } from '#source/source-labels.tsx';
import { MapSourcePoints } from '#source/source-points.tsx';
import { selectScope } from '#store/store-factory.ts';
import { useMapStore } from '#store/store.tsx';

export const MapSource: FC = function MapSource() {
	const { apiDivisionUrl, isInteractive } = useMapConfig();
	const scope = useMapStore(selectScope);

	const { pointCollection } = useMapCanvasData();
	const { data: divisionMask } = useMapDivision(scope?.apiDivisionUrl ?? apiDivisionUrl);

	// Every layer renders even while empty, since MapLibre stacks a layer added later on top
	return (
		<>
			<MapSourceDivisions data={divisionMask} />
			<MapSourceConnections rows={pointCollection.features} />
			<MapSourcePoints data={pointCollection} interactive={isInteractive} />
			<MapSourceLabels />
			<MapSourceHover />
		</>
	);
};
