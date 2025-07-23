import type { FeatureCollection } from 'geojson';
import type { FC } from 'react';

import { MapLayerIdEnum } from 'packages/react-map-component/src/config/layer';
import { MapSourceIdEnum } from 'packages/react-map-component/src/config/source';
import { useMapSourceDivisionStyle } from 'packages/react-map-component/src/source/hooks/use-map-source-division-style';
import { memo } from 'react';
import { Layer, Source } from 'react-map-gl/maplibre';

import { useMapApiDivisionData } from '../api/hooks/use-map-api-division-data';

const MapDivisionSourceLayers: FC<{ data: FeatureCollection }> = memo(
	function MapDivisionSourceLayers({ data }) {
		const divisionStyle = useMapSourceDivisionStyle();

		return (
			<Source id={MapSourceIdEnum.DivisionCollection} type="geojson" data={data} generateId={true}>
				<Layer
					key={MapLayerIdEnum.DivisionMask}
					{...divisionStyle[MapLayerIdEnum.DivisionMask]}
					beforeId={MapLayerIdEnum.Base}
				/>
				<Layer
					key={MapLayerIdEnum.DivisionHalo}
					{...divisionStyle[MapLayerIdEnum.DivisionHalo]}
					beforeId={MapLayerIdEnum.Base}
				/>
				<Layer
					key={MapLayerIdEnum.DivisionOutline}
					{...divisionStyle[MapLayerIdEnum.DivisionOutline]}
					beforeId={MapLayerIdEnum.Base}
				/>
			</Source>
		);
	},
);

export const MapDivisionSource: FC<{
	apiDivisionUrl?: string | undefined;
	isDev?: boolean | undefined;
}> = function MapDivisionSource({ apiDivisionUrl, isDev }) {
	const { data } = useMapApiDivisionData({ apiDivisionUrl, isDev });

	return data ? <MapDivisionSourceLayers data={data} /> : undefined;
};
