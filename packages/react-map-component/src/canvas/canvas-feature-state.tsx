import type { FC } from 'react';

import { useEffect, useRef } from 'react';
import { useMap } from 'react-map-gl/maplibre';

import { MapSourceIdEnum } from '#source/source-config.ts';
import { useMapSelectedId } from '#store/store.ts';

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
				{ id: previousId, source: MapSourceIdEnum.PointCollection },
				{ select: false },
			);
		}
		if (selectedId !== undefined) {
			map.setFeatureState(
				{ id: selectedId, source: MapSourceIdEnum.PointCollection },
				{ select: true },
			);
		}

		selectedFeatureIdRef.current = selectedId;
	}, [map, selectedId]);

	// Toggling dark mode re-adds every source, diffed or not, which wipes feature-state
	useEffect(() => {
		if (!map || selectedId === undefined) return;

		const target = { id: selectedId, source: MapSourceIdEnum.PointCollection };

		const onStyleData = () => {
			if (!map.getSource(target.source)) return;

			const state = map.getFeatureState(target) as { select?: boolean };

			if (state.select === true) return;

			map.setFeatureState(target, { select: true });
		};

		map.on('styledata', onStyleData);

		return () => {
			map.off('styledata', onStyleData);
		};
	}, [map, selectedId]);
};
