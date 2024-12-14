import maplibregl from 'maplibre-gl';
import { Protocol } from 'pmtiles';
import layers from 'protomaps-themes-base';
import { useMemo } from 'react';
import { useEffect } from 'react';

import type { ProtomapsBaseMapTheme } from '../../types';
import type { StyleSpecification } from 'maplibre-gl';

import { useMapLanguages } from '../../store/hooks/use-map-store';

export function useProtomaps({
	protomapsApiKey,
	baseMapTheme,
}: {
	protomapsApiKey: string;
	baseMapTheme: ProtomapsBaseMapTheme;
}) {
	const languages = useMapLanguages();

	useEffect(function loadProtomapsProtocol() {
		const protocol = new Protocol();

		// maplibregl.addProtocol('pmtiles', protocol.tile);
		maplibregl.addProtocol('pmtiles', (request) => {
			return new Promise((resolve, reject) => {
				protocol.tile(request, (err: unknown, data: unknown) => {
					if (err) {
						reject(new Error('PMTiles not loaded!'));
					} else {
						resolve({ data });
					}
				});
			});
		});

		return () => {
			maplibregl.removeProtocol('pmtiles');
		};
	}, []);

	return useMemo(
		() =>
			({
				version: 8,
				glyphs: `https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf`,
				sprite: `https://protomaps.github.io/basemaps-assets/sprites/v4/light`,
				sources: {
					protomaps: {
						type: 'vector',
						url: `https://api.protomaps.com/tiles/v4.json?key=${protomapsApiKey}`,
						attribution: `<a href="https://protomaps.com" target="_blank">Protomaps</a> | <a href="https://openstreetmap.org" target="_blank">OpenStreetMap</a>`,
					},
				},
				layers: layers('protomaps', baseMapTheme, languages?.at(0) ?? 'en'),
			}) satisfies StyleSpecification,
		[baseMapTheme, languages],
	);
}
