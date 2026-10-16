import type { FC } from 'react';

import { useEffect } from 'react';
import { useMap } from 'react-map-gl/maplibre';

import { MapSourceIdEnum } from '#source/source-config.ts';
import { useMapStore } from '#store/store.tsx';

export const MapSelectionFeatureState: FC = function MapSelectionFeatureState() {
	const { current: map } = useMap();
	const selectedId = useMapStore((state) => state.selectedId);

	useEffect(() => {
		if (!map || selectedId === undefined) return;

		const target = { id: selectedId, source: MapSourceIdEnum.PointCollection };

		function setSelect(isSelected: boolean) {
			if (!map?.getSource(target.source)) return;

			const state = map.getFeatureState(target) as { select?: boolean };

			if (state.select !== isSelected) map.setFeatureState(target, { select: isSelected });
		}

		// Toggling dark mode re-adds every source, diffed or not, which wipes feature-state
		function onStyleData() {
			setSelect(true);
		}

		setSelect(true);
		map.on('styledata', onStyleData);

		return () => {
			map.off('styledata', onStyleData);
			setSelect(false);
		};
	}, [map, selectedId]);
};
