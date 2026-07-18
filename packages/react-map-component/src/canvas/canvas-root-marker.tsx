import type { FC } from 'react';

import { useEffect, useLayoutEffect } from 'react';
import { useMap } from 'react-map-gl/maplibre';

import { useDarkMode } from '../lib/dark-mode';

// Commit the marker before paint to avoid a first-frame flash; SSR has no layout effect
const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

// One marker on the map container reaches all chrome; portaled controls and popups are its descendants
export const MapRootMarker: FC = function MapRootMarker() {
	const { current: map } = useMap();
	const isDarkMode = useDarkMode();

	useIsomorphicLayoutEffect(() => {
		if (!map) return;

		const container = map.getMap().getContainer();

		container.dataset.mapRoot = '';
		container.dataset.mapMode = isDarkMode ? 'dark' : 'light';
	}, [map, isDarkMode]);

	return;
};
