import type { FC } from 'react';
import type { SymbolLayerSpecification } from 'react-map-gl/maplibre';

import { memo, useMemo } from 'react';
import { Layer } from 'react-map-gl/maplibre';

import { useIsDarkMode } from '#lib/dark-mode.ts';
import { MapLayerIdEnum, MapSourceIdEnum } from '#source/source-config.ts';
import { getPointsLabelPaint } from '#source/source-hover.tsx';
import { selectTargetIds } from '#store/store-factory.ts';
import { useMapStore } from '#store/store.tsx';

function getTargetsLabelLayerStyle({
	isDarkMode,
	targetIds,
}: {
	isDarkMode: boolean;
	targetIds: Array<string>;
}) {
	return {
		filter: ['all', ['has', 'pointTitle'], ['in', ['get', 'id'], ['literal', targetIds]]],
		id: MapLayerIdEnum.TargetsLabel,
		layout: {
			'text-field': [
				'case',
				['has', 'pointTitleMultilingual'],
				['concat', ['get', 'pointTitle'], ' (', ['get', 'pointTitleMultilingual'], ')'],
				['get', 'pointTitle'],
			],
			'text-font': ['Noto Sans Medium'],
			'text-justify': 'auto',
			'text-max-width': 8,
			'text-radial-offset': 0.9,
			'text-size': 11,
			'text-variable-anchor': ['bottom', 'top', 'right', 'left'],
		},
		paint: getPointsLabelPaint(isDarkMode),
		source: MapSourceIdEnum.PointCollection,
		type: 'symbol',
	} satisfies SymbolLayerSpecification;
}

export const MapSourceLabels: FC = memo(function MapSourceLabels() {
	const isDarkMode = useIsDarkMode();
	const targetIds = useMapStore(selectTargetIds);

	const targetsLabelLayerStyle = useMemo(
		() => getTargetsLabelLayerStyle({ isDarkMode, targetIds }),
		[isDarkMode, targetIds],
	);

	return <Layer key={MapLayerIdEnum.TargetsLabel} {...targetsLabelLayerStyle} />;
});
