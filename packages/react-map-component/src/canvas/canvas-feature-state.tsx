import type { FC } from 'react';

import { useEffect, useRef } from 'react';
import { useMap } from 'react-map-gl/maplibre';

import { MapSourceIdEnum } from '../source/source-config';
import { useMapSelectedId } from '../store/store';

// Mirror selectedId into feature-state so the paint layers read ['feature-state','select']
// Selection changes on click, not per hover, so a store-subscribed effect is cheap here
export const MapSelectionFeatureState: FC = function MapSelectionFeatureState() {
	const { current: map } = useMap();
	const selectedId = useMapSelectedId();

	const selectedFeatureIdRef = useRef<string | undefined>(undefined);

	useEffect(() => {
		if (!map) return;

		const previousId = selectedFeatureIdRef.current;

		if (previousId === selectedId) return;

		if (previousId !== undefined) {
			map.setFeatureState(
				{ source: MapSourceIdEnum.PointCollection, id: previousId },
				{ select: false },
			);
		}
		if (selectedId !== undefined) {
			map.setFeatureState(
				{ source: MapSourceIdEnum.PointCollection, id: selectedId },
				{ select: true },
			);
		}

		selectedFeatureIdRef.current = selectedId;
	}, [map, selectedId]);
};
