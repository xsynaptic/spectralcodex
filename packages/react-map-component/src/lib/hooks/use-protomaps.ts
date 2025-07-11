import type { StyleSpecification } from 'maplibre-gl';

import { layers, namedFlavor } from '@protomaps/basemaps';
import maplibregl from 'maplibre-gl';
import { Protocol } from 'pmtiles';
import { useMemo } from 'react';
import { useEffect } from 'react';

import type { MapComponentProps } from '../../types';

import { useMapLanguages } from '../../store/hooks/use-map-store';
import { useMode } from './use-mode';

export function useProtomaps({
	protomapsApiKey,
	baseMapTheme,
	spritesId = 'custom',
	spritesUrl,
	isDev,
}: Pick<
	MapComponentProps,
	'protomapsApiKey' | 'baseMapTheme' | 'spritesId' | 'spritesUrl' | 'isDev'
>) {
	const languages = useMapLanguages();

	const isDarkMode = useMode();

	const flavor = useMemo(() => {
		return baseMapTheme ?? (isDarkMode ? namedFlavor('dark') : namedFlavor('light'));
	}, [baseMapTheme, isDarkMode]);

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
				sprite: [
					{
						id: 'default',
						url: `https://protomaps.github.io/basemaps-assets/sprites/v4/light`,
					},
					...(isDev && spritesId && spritesUrl ? [{ id: spritesId, url: spritesUrl }] : []),
				],
				sources: {
					protomaps: {
						type: 'vector',
						url: `https://api.protomaps.com/tiles/v4.json?key=${protomapsApiKey}`,
						attribution: `<a href="https://protomaps.com" target="_blank">Protomaps</a> | <a href="https://openstreetmap.org" target="_blank">OpenStreetMap</a>`,
					},
				},
				layers: layers('protomaps', flavor, { lang: languages?.at(0) ?? 'en' }),
			}) satisfies StyleSpecification,
		[flavor, isDev, languages, protomapsApiKey, spritesId, spritesUrl],
	);
}
