import type { MapDivisionMask } from '@spectralcodex/map-codec';
import type { FeatureCollection } from 'geojson';
import type { FC } from 'react';
import type { FillLayerSpecification, LineLayerSpecification } from 'react-map-gl/maplibre';

import { memo, useEffect, useMemo, useState } from 'react';
import { Layer, Source } from 'react-map-gl/maplibre';

import { getCanvasPalette } from '#lib/canvas-palette.ts';
import { useIsDarkMode } from '#lib/dark-mode.ts';
import { MapLayerIdEnum, MapSlotIdEnum, MapSourceIdEnum } from '#source/source-config.ts';

const emptyFeatureCollection: FeatureCollection<never, never> = {
	features: [],
	type: 'FeatureCollection',
};

const fadeTransition = { delay: 0, duration: 150 };

function useDivisionFade(data: MapDivisionMask | undefined) {
	const [shownData, setShownData] = useState<MapDivisionMask | undefined>();

	useEffect(() => {
		if (shownData === data) return;

		const timeout = setTimeout(
			() => {
				setShownData(data);
			},
			shownData ? fadeTransition.duration : 0,
		);

		return () => {
			clearTimeout(timeout);
		};
	}, [data, shownData]);

	return { isVisible: shownData === data && data !== undefined, shownData };
}

function useMapSourceDivisionStyle(isVisible: boolean) {
	const isDarkMode = useIsDarkMode();

	return useMemo(() => {
		const palette = getCanvasPalette(isDarkMode);

		return {
			halo: {
				id: MapLayerIdEnum.DivisionHalo,
				layout: {
					'line-cap': 'round',
					'line-join': 'round',
				},
				paint: {
					'line-blur': 5,
					'line-color': palette.divisionHalo,
					'line-opacity': isVisible ? 0.2 : 0,
					'line-opacity-transition': fadeTransition,
					'line-width': ['interpolate', ['linear'], ['zoom'], 0, 1, 8, 2, 12, 3, 18, 4],
				},
				source: MapSourceIdEnum.DivisionCollection,
				type: 'line',
			} satisfies LineLayerSpecification,
			mask: {
				id: MapLayerIdEnum.DivisionMask,
				paint: {
					'fill-color': palette.divisionFill,
					'fill-opacity': isVisible ? (isDarkMode ? 0.09 : 0.15) : 0,
					'fill-opacity-transition': fadeTransition,
				},
				source: MapSourceIdEnum.DivisionCollection,
				type: 'fill',
			} satisfies FillLayerSpecification,
			outline: {
				id: MapLayerIdEnum.DivisionOutline,
				layout: {
					'line-cap': 'round',
					'line-join': 'round',
				},
				paint: {
					'line-color': palette.divisionOutline,
					'line-opacity': isVisible ? 0.7 : 0,
					'line-opacity-transition': fadeTransition,
					'line-width': ['interpolate', ['linear'], ['zoom'], 0, 0.8, 12, 1, 18, 2],
				},
				source: MapSourceIdEnum.DivisionCollection,
				type: 'line',
			} satisfies LineLayerSpecification,
		};
	}, [isDarkMode, isVisible]);
}

export const MapSourceDivisions: FC<{ data: MapDivisionMask | undefined }> = memo(
	function MapDivisionSourceLayers({ data }) {
		const { isVisible, shownData } = useDivisionFade(data);
		const divisionStyle = useMapSourceDivisionStyle(isVisible);

		return (
			<Source
				data={shownData ?? emptyFeatureCollection}
				generateId={true}
				id={MapSourceIdEnum.DivisionCollection}
				type="geojson"
			>
				<Layer beforeId={MapSlotIdEnum.Divisions} {...divisionStyle.mask} />
				<Layer beforeId={MapSlotIdEnum.Divisions} {...divisionStyle.halo} />
				<Layer beforeId={MapSlotIdEnum.Divisions} {...divisionStyle.outline} />
			</Source>
		);
	},
);
