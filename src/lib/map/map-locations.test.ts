import type { CollectionEntry } from 'astro:content';

import { MapPopupOwnField } from '@spectralcodex/map-codec';
import { describe, expect, test, vi } from 'vitest';

import {
	getLocationFeatureIds,
	getLocationFeatures,
	getLocationsMapSourceData,
} from '#lib/map/map-locations.ts';

// Minimal fixtures; only the fields the feature builder reads, cast to the collection entry type
function makeLocation(
	id: string,
	data: Record<string, unknown> & { title: string },
): CollectionEntry<'locations'> {
	return {
		collection: 'locations',
		data: {
			category: 'temple',
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

describe('getLocationFeatures', () => {
	test('returns nothing for an empty input', () => {
		expect(getLocationFeatures([])).toEqual([]);
	});

	test('builds one feature per single-geometry location', () => {
		const result = getLocationFeatures([
			makeLocation('longshan-temple', {
				_uuid: 'abc123',
				geometry: makePoint(121.5, 25),
				title: 'Longshan Temple',
			}),
		]);

		expect(result).toHaveLength(1);
		expect(result[0]?.id).toBe('abc123');
		expect(result[0]?.geometry).toEqual({ coordinates: [121.5, 25], type: 'Point' });
		expect(result[0]?.properties.title).toBe('Longshan Temple');
	});

	test('builds one feature per point and suffixes point titles', () => {
		const result = getLocationFeatures([
			makeLocation('bopiliao', {
				_uuid: 'abc123',
				geometry: [makePoint(121.5, 25, { title: 'North Block' }), makePoint(121.51, 25.01)],
				title: 'Bopiliao',
			}),
		]);

		expect(result.map((feature) => feature.id)).toEqual(['abc123-0', 'abc123-1']);
		expect(result[0]?.properties.title).toBe('Bopiliao: North Block');
		expect(result[1]?.properties.title).toBe('Bopiliao');
	});

	test('joins entry and point multilingual titles', () => {
		const result = getLocationFeatures([
			makeLocation('bopiliao', {
				geometry: [makePoint(121.5, 25, { title: 'North Block', title_zh: '北街' })],
				title: 'Bopiliao',
				title_zh: '剝皮寮',
			}),
		]);

		expect(result[0]?.properties.titleMultilingualLang).toBe('zh');
		expect(result[0]?.properties.titleMultilingualValue).toBe('剝皮寮：北街');
	});

	test('each Point of a Location with several carries its own title, its multilingual title in brackets', () => {
		const result = getLocationFeatures([
			makeLocation('bopiliao', {
				geometry: [
					makePoint(121.5, 25, { title: 'North Block', title_zh: '北街' }),
					makePoint(121.51, 25.01, { title: 'South Block' }),
					makePoint(121.52, 25.02),
				],
				title: 'Bopiliao',
				title_zh: '剝皮寮',
			}),
			makeLocation('longshan-temple', {
				geometry: [makePoint(121.49, 25.03, { title: 'Main Hall' })],
				title: 'Longshan Temple',
			}),
		]);

		expect(result.map((feature) => feature.properties.pointTitle)).toEqual([
			'North Block (北街)',
			'South Block',
			undefined,
			undefined,
		]);
	});

	const sensitiveLocations = [
		makeLocation('sensitive-site', {
			geometry: makePoint(121.5, 25),
			hideGeometry: true,
			title: 'Sensitive Site',
		}),
		makeLocation('longshan-temple', {
			geometry: makePoint(121.49, 25.03),
			title: 'Longshan Temple',
		}),
	];

	test('drops hidden Locations under the content policy; includeHidden keeps them', async () => {
		// The policy reads the environment when its module loads, so import a fresh production copy
		vi.stubEnv('DEV', false);
		vi.resetModules();

		const production = await import('#lib/map/map-locations.ts');

		vi.unstubAllEnvs();

		expect(production.getLocationFeatures(sensitiveLocations)).toHaveLength(1);
		expect(
			production.getLocationFeatures(sensitiveLocations, { includeHidden: true }),
		).toHaveLength(2);
		expect(production.getLocationsMapRule(sensitiveLocations).ids).toEqual(['longshan-temple']);
	});
});

describe('getLocationFeatures properties', () => {
	test('reduces the page url to a path and carries external links whole', () => {
		const result = getLocationFeatures([
			makeLocation('longshan-temple', {
				_googleMapsUrl: 'https://maps.app.goo.gl/xYz123',
				_url: 'https://spectralcodex.com/locations/longshan-temple/',
				_wikipediaUrl: 'https://en.wikipedia.org/wiki/Longshan_Temple',
				geometry: makePoint(121.5, 25),
				title: 'Longshan Temple',
			}),
		]);

		const properties = result[0]?.properties;

		expect(properties?.url).toBe('/locations/longshan-temple/');
		expect(properties?.googleMapsUrl).toBe('https://maps.app.goo.gl/xYz123');
		expect(properties?.wikipediaUrl).toBe('https://en.wikipedia.org/wiki/Longshan_Temple');
	});

	test('lets a point override entry-level properties', () => {
		const result = getLocationFeatures([
			makeLocation('bopiliao', {
				_descriptionHtml: '<p>Entry description</p>',
				geometry: [makePoint(121.5, 25, { description: 'Point description', precision: 2 })],
				title: 'Bopiliao',
			}),
		]);

		const properties = result[0]?.properties;

		expect(properties?.description).toBe('Point description');
		expect(properties?.precision).toBe(2);
		expect(properties?.category).toBe('temple');
	});

	test('omits the image when a point nulls the entry thumbnail', () => {
		const thumbnail = { height: 100, src: 'thumb.avif', srcSet: 'thumb.avif 100w', width: 100 };

		const result = getLocationFeatures([
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

		expect(result[0]?.properties.image).toBe(thumbnail);
		expect(result[1]?.properties).not.toHaveProperty('image');
	});

	const thumbnail = { height: 100, src: 'thumb.avif', srcSet: 'thumb.avif 100w', width: 100 };

	test('marks what a Point of a multi-Point Location sets itself, and nothing it inherits', () => {
		const result = getLocationFeatures([
			makeLocation('bopiliao', {
				_descriptionHtml: '<p>Entry description</p>',
				_imageThumbnail: thumbnail,
				_wikipediaUrl: 'https://en.wikipedia.org/wiki/Bopiliao',
				geometry: [
					makePoint(121.5, 25),
					makePoint(121.51, 25.01, { description: 'Point description' }),
					makePoint(121.52, 25.02, { _imageThumbnail: { ...thumbnail, src: 'own.avif' } }),
					// eslint-disable-next-line unicorn/no-null -- null deliberately overrides imageFeatured to render no thumbnail
					makePoint(121.53, 25.03, { _imageThumbnail: null }),
					makePoint(121.54, 25.04, { precision: 4 }),
					makePoint(121.55, 25.05, {
						description: 'Point description',
						wikipediaUrl: 'https://en.wikipedia.org/wiki/North_Block',
					}),
				],
				title: 'Bopiliao',
			}),
		]);

		const properties = result.map((feature) => feature.properties);

		expect(properties[0]?.description).toBe('<p>Entry description</p>');
		expect(properties[0]?.image).toBe(thumbnail);
		expect(properties.map((item) => item.own)).toEqual([
			undefined,
			MapPopupOwnField.Description,
			MapPopupOwnField.Image,
			undefined,
			MapPopupOwnField.Precision,
			MapPopupOwnField.Description | MapPopupOwnField.Wikipedia,
		]);
	});

	test('marks nothing on a single-Point Location', () => {
		const result = getLocationFeatures([
			makeLocation('longshan-temple', {
				geometry: makePoint(121.5, 25, { description: 'Point description', precision: 2 }),
				title: 'Longshan Temple',
			}),
		]);

		expect(result[0]?.properties).not.toHaveProperty('own');
	});

	test("a Point of a multi-Point Location keeps its own links, and inherits the Location's Wikipedia link but never its Google Maps link", () => {
		const result = getLocationFeatures([
			makeLocation('bopiliao', {
				_googleMapsUrl: 'https://maps.app.goo.gl/entryPin',
				_wikipediaUrl: 'https://en.wikipedia.org/wiki/Bopiliao',
				geometry: [
					makePoint(121.5, 25),
					makePoint(121.51, 25.01, {
						googleMapsUrl: 'https://maps.app.goo.gl/pointPin',
						wikipediaUrl: 'https://en.wikipedia.org/wiki/North_Block',
					}),
				],
				title: 'Bopiliao',
			}),
		]);

		const properties = result.map((feature) => feature.properties);

		expect(properties.map((item) => item.googleMapsUrl)).toEqual([
			undefined,
			'https://maps.app.goo.gl/pointPin',
		]);
		expect(properties.map((item) => item.wikipediaUrl)).toEqual([
			'https://en.wikipedia.org/wiki/Bopiliao',
			'https://en.wikipedia.org/wiki/North_Block',
		]);
	});
});

describe('getLocationsMapSourceData', () => {
	test('carries the Multilingual Title beside the title, both stripped of marks for the map font', () => {
		const [row] = getLocationsMapSourceData(
			getLocationFeatures([
				makeLocation('hue-citadel', {
					geometry: makePoint(107.58, 16.47),
					title: 'Huế Citadel',
					title_vi: 'Kinh thành Huế',
				}),
			]),
		);

		expect(row?.properties).toMatchObject({
			title: 'Hue Citadel',
			titleMultilingual: 'Kinh thanh Hue',
		});
	});
});
