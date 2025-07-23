import type { FeatureCollection } from 'geojson';
import type { MapComponentProps } from 'packages/react-map-component/src/types';
import type { FC } from 'react';

import { useMapApiDivisionData } from '../api/hooks/use-map-api-division-data';
import { useMapCanvasData } from '../canvas/hooks/use-map-canvas-data';
import { useMapCanvasInteractive } from '../store/hooks/use-map-store';
import { MapSourceDebug } from './map-source-debug';
import { MapSourceDivisions } from './map-source-divisions';
import { MapSourceLines } from './map-source-lines';
import { MapSourcePoints } from './map-source-points';

export const MapSource: FC<{
	apiDivisionUrl?: string | undefined;
	hasMapIcons: boolean;
	bounds: MapComponentProps['bounds'];
	isDev?: boolean | undefined;
	isDebug?: boolean | undefined;
}> = ({ apiDivisionUrl, hasMapIcons, bounds, isDev, isDebug }) => {
	const interactive = useMapCanvasInteractive();

	const { pointCollection, lineStringCollection } = useMapCanvasData();
	const { data: divisionData } = useMapApiDivisionData({ apiDivisionUrl, isDev });

	const emptyFeatureCollection = {
		type: 'FeatureCollection',
		features: [],
	} satisfies FeatureCollection;

	/**
	 * Conditional rendering of layers leads to non-deterministic output
	 * In some cases the layers will appear in the wrong order
	 * For this reason we render all layers with empty feature collections where data is still loading
	 */
	return (
		<>
			{divisionData === false ? undefined : (
				<MapSourceDivisions data={divisionData ?? emptyFeatureCollection} />
			)}
			<MapSourceLines data={lineStringCollection ?? emptyFeatureCollection} />
			<MapSourcePoints
				data={pointCollection ?? emptyFeatureCollection}
				interactive={interactive}
				hasMapIcons={hasMapIcons}
			/>
			{isDebug && bounds ? <MapSourceDebug bounds={bounds} /> : undefined}
		</>
	);
};
