import type { FeatureCollection } from 'geojson';
import type { FC } from 'react';

import { memo } from 'react';
import { Layer, Source } from 'react-map-gl/maplibre';

import { MapLayerIdEnum } from '../config/layer';
import { MapSourceIdEnum } from '../config/source';
import { useMapSourceDivisionStyle } from '../source/hooks/use-map-source-division-style';

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
