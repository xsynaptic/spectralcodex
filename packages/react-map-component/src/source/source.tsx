import type { FeatureCollection } from 'geojson';
import type { FC } from 'react';

import type { MapComponentProps } from '#types.ts';

import { useMapCanvasData } from '#canvas/canvas-data.tsx';
import { useMapApiDivisionData } from '#data/data-division.ts';
import { MapSourceDebug } from '#source/source-debug.tsx';
import { MapSourceDivisions } from '#source/source-divisions.tsx';
import { MapSourceHover } from '#source/source-hover.tsx';
import { MapSourceLabels } from '#source/source-labels.tsx';
import { MapSourceLines } from '#source/source-lines.tsx';
import { MapSourcePoints } from '#source/source-points.tsx';
import { useIsMapCanvasInteractive } from '#store/store.ts';
import { useMapView } from '#view/view.tsx';

const isDebug = false as boolean;

const emptyFeatureCollection: FeatureCollection<never, never> = {
	features: [],
	type: 'FeatureCollection',
};

export const MapSource: FC<
	Pick<MapComponentProps, 'apiDivisionUrl' | 'isDev'> & {
		bounds: MapComponentProps['bounds'] | undefined;
	}
> = function MapSource({ apiDivisionUrl, bounds, isDev }) {
	const isInteractive = useIsMapCanvasInteractive();
	const view = useMapView();

	const { lineStringCollection, pointCollection } = useMapCanvasData();
	const { data: divisionData } = useMapApiDivisionData({
		apiDivisionUrl: view.scope?.apiDivisionUrl ?? apiDivisionUrl,
		isDev,
	});

	/**
	 * Conditional rendering of layers leads to non-deterministic output
	 * In some cases the layers will appear in the wrong order
	 * For this reason we render all layers with empty feature collections where data is still loading
	 */
	return (
		<>
			<MapSourceDivisions data={divisionData} />
			<MapSourceLines data={lineStringCollection ?? emptyFeatureCollection} />
			<MapSourcePoints
				data={pointCollection ?? emptyFeatureCollection}
				interactive={isInteractive}
			/>
			<MapSourceLabels />
			<MapSourceHover />
			{isDebug && bounds ? <MapSourceDebug bounds={bounds} /> : undefined}
		</>
	);
};
