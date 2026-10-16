import type { StyleSpecification } from 'maplibre-gl';

import { layers, namedFlavor } from '@protomaps/basemaps';
import { useMemo } from 'react';

import type { MapComponentProps } from '#types.ts';

import { useIsDarkMode } from '#lib/dark-mode.ts';

export function useProtomaps({
	baseMapTheme,
	languages,
	protomapsApiKey,
}: Pick<MapComponentProps, 'baseMapTheme' | 'protomapsApiKey'> & {
	languages: ReadonlyArray<string>;
}) {
	const isDarkMode = useIsDarkMode();

	const flavor = useMemo(() => {
		return baseMapTheme ?? namedFlavor(isDarkMode ? 'dark' : 'light');
	}, [baseMapTheme, isDarkMode]);

	const protomapsStyleSpec = useMemo(
		() =>
			protomapsApiKey
				? {
						glyphs: 'https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf',
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
						],
						version: 8,
					}
				: {
						layers: [],
						sources: {},
						version: 8,
					},
		[flavor, isDarkMode, protomapsApiKey, languages],
	) satisfies StyleSpecification;

	return protomapsStyleSpec;
}
