import type { FC } from 'react';

import { useEffect } from 'react';
import { useMap } from 'react-map-gl/maplibre';

import { MapSourceIdEnum } from '#source/source-config.ts';
import { useMapStore } from '#store/store.tsx';

// Mirror selectedId into feature-state so the paint layers read ['feature-state', 'select']
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

		setSelect(true);

		return () => {
			setSelect(false);
		};
	}, [map, selectedId]);
};
