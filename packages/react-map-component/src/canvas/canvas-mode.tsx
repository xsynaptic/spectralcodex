import type { Map as MaplibreMap } from 'maplibre-gl';
import type { FC } from 'react';

import { modeChangedEventName } from '@spectralcodex/shared/constants';
import { useEffect, useRef } from 'react';
import { useMap } from 'react-map-gl/maplibre';

import { useMapConfig } from '#lib/config.tsx';
import { isDocumentDark, useIsDarkMode } from '#lib/dark-mode.ts';
import { setBasemapMode } from '#lib/protomaps.ts';

const coverFadeMs = 200;
const coverMaxWaitMs = 1500;

function coverCanvas(map: MaplibreMap) {
	const canvas = map.getCanvas();

	if (canvas.width === 0 || canvas.height === 0) return;

	const cover = document.createElement('canvas');

	cover.className = 'map-mode-cover';
	cover.width = canvas.width;
	cover.height = canvas.height;

	// The WebGL drawing buffer is only readable in the task that drew it
	map.redraw();
	cover.getContext('2d')?.drawImage(canvas, 0, 0);
	canvas.after(cover);

	return cover;
}

function uncoverWhenLoaded(map: MaplibreMap, cover: HTMLCanvasElement) {
	const revealWhenLoaded = () => {
		if (map.loaded()) reveal();
	};

	const reveal = () => {
		clearTimeout(timeout);
		map.off('render', revealWhenLoaded);
		map.off('movestart', reveal);

		const fade = cover.animate([{ opacity: 1 }, { opacity: 0 }], {
			duration: coverFadeMs,
			easing: 'ease-out',
		});

		fade.addEventListener('finish', () => {
			cover.remove();
		});
	};

	const timeout = setTimeout(reveal, coverMaxWaitMs);

	map.on('render', revealWhenLoaded);
	map.once('movestart', reveal);
}

export const MapCanvasMode: FC<{ initialIsDarkMode: boolean }> = function MapCanvasMode({
	initialIsDarkMode,
}) {
	const { current: map } = useMap();
	const { baseMapTheme, languages, protomapsApiKey } = useMapConfig();
	const isDarkMode = useIsDarkMode();
	const appliedIsDarkMode = useRef(initialIsDarkMode);
	const coverRef = useRef<HTMLCanvasElement>(undefined);

	// Layers restyle during React's render, which runs after this event dispatch
	useEffect(() => {
		if (!map) return;

		const handleModeChanged = () => {
			if (coverRef.current || isDocumentDark() === appliedIsDarkMode.current) return;

			coverRef.current = coverCanvas(map.getMap());
		};

		document.addEventListener(modeChangedEventName, handleModeChanged);

		return () => {
			document.removeEventListener(modeChangedEventName, handleModeChanged);
		};
	}, [map]);

	useEffect(() => {
		if (!map || appliedIsDarkMode.current === isDarkMode) return;

		appliedIsDarkMode.current = isDarkMode;

		if (protomapsApiKey) setBasemapMode(map.getMap(), { baseMapTheme, isDarkMode, languages });

		if (!coverRef.current) return;

		uncoverWhenLoaded(map.getMap(), coverRef.current);
		coverRef.current = undefined;
	}, [map, baseMapTheme, isDarkMode, languages, protomapsApiKey]);

	return;
};
