import type { FC } from 'react';

import { MapLayerIdEnum } from 'packages/react-map-component/src/config/layer';
import { MapSourceIdEnum } from 'packages/react-map-component/src/config/source';
import { Layer, Source } from 'react-map-gl/maplibre';

// A dummy layer to help with positioning
export const MapBaseSource: FC = function MapBaseSource() {
	return (
		<Source
			id={MapSourceIdEnum.BaseCollection}
			type="geojson"
			data={{ type: 'FeatureCollection', features: [] }}
			generateId={true}
		>
			<Layer id={MapLayerIdEnum.Base} type="symbol" />
		</Source>
	);
};
