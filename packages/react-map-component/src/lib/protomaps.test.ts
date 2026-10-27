import type { LayerSpecification } from 'maplibre-gl';

import { namedFlavor } from '@protomaps/basemaps';
import * as R from 'remeda';
import { expect, test } from 'vitest';

import { getBasemapLayers } from '#lib/protomaps.ts';

const light = getBasemapLayers(namedFlavor('light'), 'en');
const dark = getBasemapLayers(namedFlavor('dark'), 'en');

function getPaintNames(layer: LayerSpecification) {
	return R.keys(layer.paint ?? {}).toSorted((first, second) => first.localeCompare(second));
}

test('the light and dark basemaps share every layer, layout and filter', () => {
	expect(dark.map((layer) => R.omit(layer, ['paint']))).toEqual(
		light.map((layer) => R.omit(layer, ['paint'])),
	);
});

test('the light and dark basemaps set the same paint properties on each layer', () => {
	expect(dark.map((layer) => getPaintNames(layer))).toEqual(
		light.map((layer) => getPaintNames(layer)),
	);
});
