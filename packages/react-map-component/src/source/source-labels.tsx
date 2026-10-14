import type { FC } from 'react';
import type { SymbolLayerSpecification } from 'react-map-gl/maplibre';

import { memo, useMemo } from 'react';
import { Layer } from 'react-map-gl/maplibre';

import { useIsDarkMode } from '#lib/dark-mode.tsx';
import { MapLayerIdEnum, MapSourceIdEnum } from '#source/source-config.ts';
import { getPointsLabelPaint } from '#source/source-hover.tsx';
import { useMapHoveredId } from '#store/store.ts';
import { useMapTargetIds } from '#view/view.tsx';

function getTargetsLabelLayerStyle({
	hoveredId,
	isDarkMode,
	targetIds,
}: {
	hoveredId: string | undefined;
	isDarkMode: boolean;
	targetIds: Array<string>;
}) {
	return {
		filter: [
			'all',
			['has', 'pointTitle'],
			['in', ['get', 'id'], ['literal', targetIds]],
			['!=', ['get', 'id'], hoveredId ?? ''],
		],
		id: MapLayerIdEnum.TargetsLabel,
		layout: {
			'text-field': ['get', 'pointTitle'],
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
	const hoveredId = useMapHoveredId();
	const targetIds = useMapTargetIds();

	const targetsLabelLayerStyle = useMemo(
		() => getTargetsLabelLayerStyle({ hoveredId, isDarkMode, targetIds }),
		[hoveredId, isDarkMode, targetIds],
	);

	return <Layer key={MapLayerIdEnum.TargetsLabel} {...targetsLabelLayerStyle} />;
});
