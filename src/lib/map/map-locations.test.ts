import type { CollectionEntry } from 'astro:content';

import { describe, expect, test } from 'vitest';

import { getLocationFeatureIds, getLocationsFeatureCollection } from '#lib/map/map-locations.ts';

// Minimal fixtures; only the fields the feature builder reads, cast to the collection entry type
function makeLocation(
	id: string,
	data: Record<string, unknown> & { title: string },
): CollectionEntry<'locations'> {
	return {
		collection: 'locations',
		data: {
			category: 'temple',
			entryQuality: 3,
			precision: 4,
			rating: 3,
			status: 'operational',
			...data,
		},
		id,
	} as unknown as CollectionEntry<'locations'>;
}

function makePoint(longitude: number, latitude: number, extra: Record<string, unknown> = {}) {
	return { coordinates: [longitude, latitude], type: 'Point', ...extra };
}

describe('getLocationFeatureIds', () => {
	test('uses the map uuid for a single-geometry location', () => {
		const entry = makeLocation('longshan-temple', {
			_uuid: 'abc123',
			geometry: makePoint(121.5, 25),
			title: 'Longshan Temple',
		});

		expect(getLocationFeatureIds(entry)).toEqual(['abc123']);
	});

	test('falls back to the entry id when no uuid was stamped', () => {
		const entry = makeLocation('longshan-temple', {
			geometry: makePoint(121.5, 25),
			title: 'Longshan Temple',
		});

		expect(getLocationFeatureIds(entry)).toEqual(['longshan-temple']);
	});

	test('suffixes each point of a multi-geometry location', () => {
		const entry = makeLocation('bopiliao', {
			_uuid: 'abc123',
			geometry: [makePoint(121.5, 25), makePoint(121.51, 25.01), makePoint(121.52, 25.02)],
			title: 'Bopiliao',
		});

		expect(getLocationFeatureIds(entry)).toEqual(['abc123-0', 'abc123-1', 'abc123-2']);
	});

	test('does not suffix a geometry array of one', () => {
		const entry = makeLocation('bopiliao', {
			_uuid: 'abc123',
			geometry: [makePoint(121.5, 25)],
			title: 'Bopiliao',
		});

		expect(getLocationFeatureIds(entry)).toEqual(['abc123']);
	});
});

describe('getLocationsFeatureCollection', () => {
	test('returns undefined for missing or empty input', () => {
		expect(getLocationsFeatureCollection(undefined)).toBeUndefined();
		expect(getLocationsFeatureCollection([])).toBeUndefined();
	});

	test('builds one feature per single-geometry location', () => {
		const result = getLocationsFeatureCollection([
			makeLocation('longshan-temple', {
				_uuid: 'abc123',
				geometry: makePoint(121.5, 25),
				title: 'Longshan Temple',
			}),
		]);

		expect(result?.features).toHaveLength(1);
		expect(result?.features[0]?.id).toBe('abc123');
		expect(result?.features[0]?.geometry).toEqual({ coordinates: [121.5, 25], type: 'Point' });
		expect(result?.features[0]?.properties.title).toBe('Longshan Temple');
	});

	test('builds one feature per point and suffixes point titles', () => {
		const result = getLocationsFeatureCollection([
			makeLocation('bopiliao', {
				_uuid: 'abc123',
				geometry: [makePoint(121.5, 25, { title: 'North Block' }), makePoint(121.51, 25.01)],
				title: 'Bopiliao',
			}),
		]);

		expect(result?.features.map((feature) => feature.id)).toEqual(['abc123-0', 'abc123-1']);
		expect(result?.features[0]?.properties.title).toBe('Bopiliao: North Block');
		expect(result?.features[1]?.properties.title).toBe('Bopiliao');
	});

	test('joins entry and point multilingual titles', () => {
		const result = getLocationsFeatureCollection([
			makeLocation('bopiliao', {
				geometry: [makePoint(121.5, 25, { title: 'North Block', title_zh: '北街' })],
				title: 'Bopiliao',
				title_zh: '剝皮寮',
			}),
		]);

		expect(result?.features[0]?.properties.titleMultilingualLang).toBe('zh');
		expect(result?.features[0]?.properties.titleMultilingualValue).toBe('剝皮寮：北街');
	});

	test('hideSensitiveLocations filters hidden locations, and false keeps them', () => {
		const locations = [
			makeLocation('sensitive-site', {
				geometry: makePoint(121.5, 25),
				hideLocation: true,
				title: 'Sensitive Site',
			}),
			makeLocation('longshan-temple', {
				geometry: makePoint(121.49, 25.03),
				title: 'Longshan Temple',
			}),
		];

		expect(
			getLocationsFeatureCollection(locations, { hideSensitiveLocations: true })?.features,
		).toHaveLength(1);
		expect(
			getLocationsFeatureCollection(locations, { hideSensitiveLocations: false })?.features,
		).toHaveLength(2);
	});

	test('reuses the same feature objects when a location is mapped again', () => {
		const entry = makeLocation('longshan-temple', {
			_uuid: 'abc123',
			geometry: makePoint(121.5, 25),
			title: 'Longshan Temple',
		});

		const first = getLocationsFeatureCollection([entry]);
		const second = getLocationsFeatureCollection([entry]);

		expect(second?.features[0]).toBe(first?.features[0]);
	});
});

describe('getLocationsFeatureCollection properties', () => {
	test('reduces urls to relative paths and strips url scheme from external links', () => {
		const result = getLocationsFeatureCollection([
			makeLocation('longshan-temple', {
				_googleMapsUrl: 'https://maps.app.goo.gl/xYz123',
				_url: 'https://spectralcodex.com/locations/longshan-temple/',
				_wikipediaUrl: 'https://en.wikipedia.org/wiki/Longshan_Temple',
				geometry: makePoint(121.5, 25),
				title: 'Longshan Temple',
			}),
		]);

		const properties = result?.features[0]?.properties;

		expect(properties?.url).toBe('/locations/longshan-temple/');
		expect(properties?.googleMapsUrl).toBe('xYz123');
		expect(properties?.wikipediaUrl).toBe('en.wikipedia.org/wiki/Longshan_Temple');
	});

	test('lets a point override entry-level properties', () => {
		const result = getLocationsFeatureCollection([
			makeLocation('bopiliao', {
				_descriptionHtml: '<p>Entry description</p>',
				geometry: [makePoint(121.5, 25, { description: 'Point description', precision: 2 })],
				title: 'Bopiliao',
			}),
		]);

		const properties = result?.features[0]?.properties;

		expect(properties?.description).toBe('Point description');
		expect(properties?.precision).toBe(2);
		expect(properties?.category).toBe('temple');
	});

	test('omits the image when a point nulls the entry thumbnail', () => {
		const thumbnail = { height: 100, src: 'thumb.avif', srcSet: 'thumb.avif 100w', width: 100 };

		const result = getLocationsFeatureCollection([
			makeLocation('bopiliao', {
				_imageThumbnail: thumbnail,
				geometry: [
					makePoint(121.5, 25),
					// eslint-disable-next-line unicorn/no-null -- null deliberately overrides imageFeatured to render no thumbnail
					makePoint(121.51, 25.01, { _imageThumbnail: null }),
				],
				title: 'Bopiliao',
			}),
		]);

		expect(result?.features[0]?.properties.image).toBe(thumbnail);
		expect(result?.features[1]?.properties).not.toHaveProperty('image');
	});
});
