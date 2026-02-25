import maplibreCssHref from 'maplibre-gl/dist/maplibre-gl.css?url';
import { useEffect } from 'react';

// Lazy load MapLibre CSS to avoid blocking the main thread
export function useStyleLoader() {
	useEffect(() => {
		const linkElement = document.createElement('link');

		linkElement.rel = 'stylesheet';
		linkElement.href = maplibreCssHref;

		document.head.append(linkElement);

		return () => {
			linkElement.remove();
		};
	}, []);
}
