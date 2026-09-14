import type { StyleSpecification } from 'maplibre-gl';

import { layers, namedFlavor } from '@protomaps/basemaps';
import { addProtocol, removeProtocol } from 'maplibre-gl';
import { Protocol } from 'pmtiles';
import { useMemo } from 'react';
import { useEffect } from 'react';

import type { MapComponentProps } from '#types.ts';

import { useIsDarkMode } from '#lib/dark-mode.tsx';
import { useMapLanguages } from '#store/store.ts';

export function useProtomaps({
	baseMapTheme,
	protomapsApiKey,
	spritesId,
	spritesUrl,
}: Pick<
	MapComponentProps,
	'baseMapTheme' | 'isDev' | 'protomapsApiKey' | 'spritesId' | 'spritesUrl'
>) {
	const isDarkMode = useIsDarkMode();

	const languages = useMapLanguages();

	const flavor = useMemo(() => {
		return baseMapTheme ?? namedFlavor(isDarkMode ? 'dark' : 'light');
	}, [baseMapTheme, isDarkMode]);

	const protomapsStyleSpec = useMemo(
		() =>
			protomapsApiKey
				? {
						glyphs: `https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf`,
						layers: layers('protomaps', flavor, { lang: languages.at(0) ?? 'en' }),
						sources: {
							protomaps: {
								attribution: `<a href="https://protomaps.com" target="_blank">Protomaps</a> | <a href="https://openstreetmap.org" target="_blank">OpenStreetMap</a>`,
								type: 'vector',
								url: `https://api.protomaps.com/tiles/v4.json?key=${protomapsApiKey}`,
							},
						},
						sprite: [
							{
								id: 'default',
								url: `https://protomaps.github.io/basemaps-assets/sprites/v4/${isDarkMode ? 'dark' : 'light'}`,
							},
							...(spritesUrl ? [{ id: spritesId ?? 'custom', url: spritesUrl }] : []),
						],
						version: 8,
					}
				: {
						layers: [],
						sources: {},
						version: 8,
					},
		[flavor, isDarkMode, protomapsApiKey, spritesId, spritesUrl, languages],
	) satisfies StyleSpecification;

	useEffect(function loadProtomapsProtocol() {
		const protocol = new Protocol();

		addProtocol('pmtiles', (request) => {
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
			removeProtocol('pmtiles');
		};
	}, []);

	return protomapsStyleSpec;
}
