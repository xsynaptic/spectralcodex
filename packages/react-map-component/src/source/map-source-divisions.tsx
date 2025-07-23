import type { FeatureCollection } from 'geojson';
import type { FC } from 'react';

import { MapLayerIdEnum } from 'packages/react-map-component/src/config/layer';
import { MapSourceIdEnum } from 'packages/react-map-component/src/config/source';
import { useMapSourceDivisionStyle } from 'packages/react-map-component/src/source/hooks/use-map-source-division-style';
import { memo } from 'react';
import { Layer, Source } from 'react-map-gl/maplibre';

export const MapSourceDivisions: FC<{ data: FeatureCollection }> = memo(
	function MapDivisionSourceLayers({ data }) {
		const divisionStyle = useMapSourceDivisionStyle();

		return (
			<Source id={MapSourceIdEnum.DivisionCollection} type="geojson" data={data} generateId={true}>
				<Layer key={MapLayerIdEnum.DivisionMask} {...divisionStyle[MapLayerIdEnum.DivisionMask]} />
				<Layer key={MapLayerIdEnum.DivisionHalo} {...divisionStyle[MapLayerIdEnum.DivisionHalo]} />
				<Layer
					key={MapLayerIdEnum.DivisionOutline}
					{...divisionStyle[MapLayerIdEnum.DivisionOutline]}
				/>
			</Source>
		);
	},
);
