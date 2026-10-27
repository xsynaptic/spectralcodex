import type { Flavor } from '@protomaps/basemaps';
import type {
	AllPaintProperties,
	LayerSpecification,
	Map as MaplibreMap,
	StyleSpecification,
} from 'maplibre-gl';

import { layers, namedFlavor } from '@protomaps/basemaps';
import * as R from 'remeda';

import type { MapComponentProps } from '#types.ts';

interface BasemapModeOptions extends Pick<MapComponentProps, 'baseMapTheme'> {
	isDarkMode: boolean;
	languages: ReadonlyArray<string>;
}

export function getBasemapLayers(flavor: Flavor, language: string): Array<LayerSpecification> {
	return layers('protomaps', flavor, { lang: language }).map((layer) => {
		if (layer.id !== 'pois' || layer.type !== 'symbol') return layer;

		const iconImage = layer.layout?.['icon-image'];

		if (typeof iconImage !== 'string' && !Array.isArray(iconImage)) return layer;

		return {
			...layer,
			layout: {
				...layer.layout,
				'icon-image': ['match', ['get', 'kind'], 'townhall', 'building', iconImage],
			},
		};
	});
}

function getModeLayers({ baseMapTheme, isDarkMode, languages }: BasemapModeOptions) {
	const flavor = baseMapTheme ?? namedFlavor(isDarkMode ? 'dark' : 'light');

	return getBasemapLayers(flavor, languages.at(0) ?? 'en');
}

function getModeSprite(isDarkMode: boolean) {
	return `https://protomaps.github.io/basemaps-assets/sprites/v4/${isDarkMode ? 'dark' : 'light'}`;
}

export function getBasemapStyle({
	protomapsApiKey,
	...modeOptions
}: BasemapModeOptions & Pick<MapComponentProps, 'protomapsApiKey'>): StyleSpecification {
	// The map only draws in the browser, which builds this style when the map loads, so the build skips it
	if (!protomapsApiKey || typeof window === 'undefined') {
		return { layers: [], sources: {}, version: 8 };
	}

	return {
		glyphs: 'https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf',
		layers: getModeLayers(modeOptions),
		sources: {
			protomaps: {
				attribution: `<a href="https://protomaps.com" target="_blank">Protomaps</a> | <a href="https://openstreetmap.org" target="_blank">OpenStreetMap</a>`,
				type: 'vector',
				url: `https://api.protomaps.com/tiles/v4.json?key=${protomapsApiKey}`,
			},
		},
		sprite: getModeSprite(modeOptions.isDarkMode),
		version: 8,
	};
}

export function setBasemapMode(map: MaplibreMap, modeOptions: BasemapModeOptions) {
	for (const layer of getModeLayers(modeOptions)) {
		const paint: AllPaintProperties = layer.paint ?? {};

		for (const [name, value] of R.entries(paint)) {
			map.setPaintProperty(layer.id, name, value);
		}
	}

	map.setSprite(getModeSprite(modeOptions.isDarkMode));
}
