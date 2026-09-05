import type { FeatureCollection } from 'geojson';
import type { FC } from 'react';

import type { MapComponentProps } from '#types.ts';

import { useMapCanvasData } from '#canvas/canvas-data.tsx';
import { useMapApiDivisionData } from '#data/data-division.ts';
import { useIsMapCanvasInteractive } from '#store/store.ts';

import { MapSourceDebug } from './source-debug.tsx';
import { MapSourceDivisions } from './source-divisions.tsx';
import { MapSourceLines } from './source-lines.tsx';
import { MapSourcePoints } from './source-points.tsx';

const isDebug = false as boolean;

const emptyFeatureCollection: FeatureCollection<never, never> = {
	type: 'FeatureCollection',
	features: [],
};

export const MapSource: FC<
	Pick<MapComponentProps, 'apiDivisionUrl' | 'isDev' | 'targetIds'> & {
		bounds: MapComponentProps['bounds'] | undefined;
		hasMapIcons: boolean;
	}
> = function MapSource({ apiDivisionUrl, hasMapIcons, bounds, isDev, targetIds }) {
	const isInteractive = useIsMapCanvasInteractive();

	const { pointCollection, lineStringCollection } = useMapCanvasData();
	const { data: divisionData } = useMapApiDivisionData({ apiDivisionUrl, isDev });

	/**
	 * Conditional rendering of layers leads to non-deterministic output
	 * In some cases the layers will appear in the wrong order
	 * For this reason we render all layers with empty feature collections where data is still loading
	 */
	return (
		<>
			<MapSourceDivisions data={divisionData ?? emptyFeatureCollection} />
			<MapSourceLines data={lineStringCollection ?? emptyFeatureCollection} />
			<MapSourcePoints
				data={pointCollection ?? emptyFeatureCollection}
				interactive={isInteractive}
				hasMapIcons={hasMapIcons}
				targetIds={targetIds}
			/>
			{isDebug && bounds ? <MapSourceDebug bounds={bounds} /> : undefined}
		</>
	);
};
