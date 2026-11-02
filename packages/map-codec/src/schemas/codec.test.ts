import { fc, test } from '@fast-check/vitest';
import { GeometryTypeEnum, LocationStatusEnum } from '@spectralcodex/shared/map';
import { describe, expect } from 'vitest';
import { z } from 'zod';

import type { MapDirectoryColumns, MapPopupItem, MapSourceItem } from '#schemas/codec.ts';

import { decodeMapDirectory, decodeMapPopupData } from '#codec-decode.ts';
import { mapPopupKeys, mapSourceKeys } from '#codec-tables.ts';
import { LocationStatusNumericMapping } from '#map-codes.ts';
import { getMapRowUrl } from '#map-ids.ts';
import {
	encodeMapDirectory,
	encodeMapPopupData,
	MapDirectorySchema,
	MapPopupItemSchema,
	MapSourceItemSchema,
} from '#schemas/codec.ts';

function byCodePoint(first: string, second: string): number {
	return first.localeCompare(second);
}

const residualCases = [
	{ form: 'exact', id: 'dagangshan-airfield', stored: '', title: 'Dagangshan Airfield' },
	{
		form: 'prefix',
		id: 'alian-dagangshan-airfield',
		stored: 'alian-',
		title: 'Dagangshan Airfield',
	},
	{ form: 'full', id: 'longquan-temple', stored: 'longquan-temple', title: 'Lungchuan Temple' },
	{ form: 'folded', id: 'cafe-and-bars', stored: '', title: 'Cafe & Bar’s' },
	{ form: 'non-ASCII letter', id: 'cafe-bar', stored: 'cafe-bar', title: 'Café Bar' },
	{
		form: 'multi-Point prefix',
		id: 'baozhong-longyan-sugar-factory:0',
		stored: 'baozhong-:0',
		title: 'Longyan Sugar Factory',
	},
	{ form: 'multi-Point exact', id: 'old-street:12', stored: ':12', title: 'Old Street' },
	{ form: 'single-Point colon', id: 'fort-north', stored: '', title: 'Fort: North' },
	{ form: 'multi-Point colon', id: 'fort-north:0', stored: ':0', title: 'Fort: North' },
	{ form: 'empty slug', id: 'dagangshan', stored: 'dagangshan', title: '大崗山' },
];

const textArbitrary = fc.string({ maxLength: 12, unit: 'grapheme' });

const slugWordsArbitrary = fc.array(fc.stringMatching(/^[a-z0-9]{1,6}$/), {
	maxLength: 3,
	minLength: 1,
});

function capitalize(word: string) {
	return `${word.charAt(0).toUpperCase()}${word.slice(1)}`;
}

const rowNameArbitrary = fc
	.record({
		core: slugWordsArbitrary,
		pointIndex: fc.option(fc.nat({ max: 12 })),
		prefix: fc.array(fc.stringMatching(/^[a-z0-9]{1,6}$/), { maxLength: 2 }),
		separator: fc.constantFrom(' ', ': ', ' – ', ', ', ' (', '’'),
		unrelatedTitle: fc.option(textArbitrary),
	})
	.map(({ core, pointIndex, prefix, separator, unrelatedTitle }) => ({
		id: `${[...prefix, ...core].join('-')}${pointIndex === null ? '' : `:${String(pointIndex)}`}`,
		title: unrelatedTitle ?? core.map((word) => capitalize(word)).join(separator),
	}));

const finiteCoordinateArbitrary = fc
	.double({ max: 180, min: -180, noNaN: true })
	.filter((value) => !Object.is(value, -0));

const sourceRowArbitrary = fc
	.tuple(
		rowNameArbitrary,
		fc.tuple(finiteCoordinateArbitrary, finiteCoordinateArbitrary),
		fc.record(
			{
				chunkKey: fc.stringMatching(/^\d{1,3}$/),
				entryQuality: fc.integer({ max: 5, min: 1 }),
				hasImage: fc.boolean(),
				objective: fc.integer({ max: 5, min: 0 }),
				outlier: fc.boolean(),
				pointTitle: textArbitrary,
				pointTitleMultilingual: textArbitrary,
				precision: fc.integer({ max: 5, min: 1 }),
				rating: fc.integer({ max: 5, min: 1 }),
				regionOrdinals: fc.array(fc.nat({ max: 40 }), { maxLength: 3 }),
				status: fc.constantFrom(...Object.values(LocationStatusEnum)),
				themeIndices: fc.array(fc.nat({ max: 8 }), { maxLength: 3 }),
				titleMultilingual: textArbitrary,
			},
			{ requiredKeys: ['entryQuality', 'hasImage', 'precision', 'rating', 'status'] },
		),
	)
	.map(([{ id, title }, coordinates, properties]): MapSourceItem => ({
		geometry: { coordinates, type: GeometryTypeEnum.Point },
		properties: { ...properties, id, title, url: getMapRowUrl(id) },
		type: 'Feature',
	}));

const directoryRowsArbitrary = fc
	.uniqueArray(sourceRowArbitrary, { maxLength: 10, selector: (row) => row.properties.id })
	.chain((rows) => {
		const ids = rows.map((row) => row.properties.id);

		return fc.tuple(
			fc.constant(rows),
			fc.tuple(...rows.map(() => fc.option(fc.subarray(ids), { nil: undefined }))),
		);
	})
	.map(([rows, backlinksByRow]) =>
		rows.map((row, index): MapSourceItem => {
			const backlinks = backlinksByRow[index];

			if (backlinks === undefined) return row;

			return { ...row, properties: { ...row.properties, backlinks } };
		}),
	);

const googleMapsUrlArbitrary = fc.oneof(
	fc.stringMatching(/^[A-Za-z0-9/]{1,17}$/).map((token) => `https://maps.app.goo.gl/${token}`),
	fc.webUrl(),
);

const popupItemArbitrary: fc.Arbitrary<MapPopupItem> = fc.record(
	{
		description: textArbitrary,
		googleMapsUrl: googleMapsUrlArbitrary,
		id: fc.stringMatching(/^[a-z0-9]+(?:-[a-z0-9]+){0,2}(?::\d{1,2})?$/),
		own: fc.nat({ max: 5 }),
		ownTitle: textArbitrary,
		ownTitleMultilingualLang: fc.constantFrom('zh', 'ja', 'th', 'vi'),
		ownTitleMultilingualValue: textArbitrary,
		popupImageSources: fc.array(
			fc.record(
				{
					path: fc.stringMatching(/^[a-z0-9-]{1,8}(?:\/[a-z0-9-]{1,8})?-\d{2,4}x\d{2,4}\.webp$/),
					width: fc.integer({ max: 4000, min: 1 }),
				},
				{ noNullPrototype: true },
			),
			{ maxLength: 3, minLength: 1 },
		),
		title: textArbitrary,
		titleMultilingualLang: fc.constantFrom('zh', 'ja', 'th', 'vi'),
		titleMultilingualValue: textArbitrary,
		wikipediaUrl: fc.webUrl(),
	},
	{ noNullPrototype: true, requiredKeys: ['id', 'title'] },
);

describe('MapSourceItemSchema decode', () => {
	test('decompresses keys, inverts numeric enum codes, applies hasImage and entryQuality defaults', () => {
		const result = MapSourceItemSchema.parse({
			[mapSourceKeys.geometry]: [100, 13],
			[mapSourceKeys.id]: 'location-1',
			[mapSourceKeys.objective]: 2,
			[mapSourceKeys.precision]: 3,
			[mapSourceKeys.rating]: 5,
			[mapSourceKeys.status]: LocationStatusNumericMapping[LocationStatusEnum.Abandoned],
			[mapSourceKeys.title]: 'Location',
		});

		expect(result).toEqual({
			geometry: {
				coordinates: [100, 13],
				type: GeometryTypeEnum.Point,
			},
			properties: {
				entryQuality: 1,
				hasImage: false,
				id: 'location-1',
				objective: 2,
				precision: 3,
				rating: 5,
				status: LocationStatusEnum.Abandoned,
				title: 'Location',
				url: '/location-1/',
			},
			type: 'Feature',
		});
	});
});

describe('MapSourceItemSchema encode (byte-faithful compressed form)', () => {
	test('omits absent optionals; never emits hasImage:false or entryQuality:1', () => {
		const standard: MapSourceItem = {
			geometry: { coordinates: [0, 0], type: GeometryTypeEnum.Point },
			properties: {
				entryQuality: 1,
				hasImage: false,
				id: 'b',
				precision: 1,
				rating: 1,
				status: LocationStatusEnum.Abandoned,
				title: 'B',
			},
			type: 'Feature',
		};

		const compressed = z.encode(MapSourceItemSchema, standard);
		const keys = Object.keys(compressed).toSorted(byCodePoint);

		expect(keys).toEqual(
			[
				mapSourceKeys.id,
				mapSourceKeys.title,
				mapSourceKeys.status,
				mapSourceKeys.precision,
				mapSourceKeys.rating,
				mapSourceKeys.geometry,
			].toSorted(byCodePoint),
		);
	});
});

describe('round trips', () => {
	test.prop([directoryRowsArbitrary])(
		'a directory decodes back to its rows through JSON, by the schema and the fast path alike',
		(rows) => {
			const columns = directoryOf(rows);

			expect(MapDirectorySchema.parse(columns)).toStrictEqual(rows);
			expect(decodeMapDirectory(columns)).toStrictEqual(rows);
		},
	);

	test.prop([fc.array(popupItemArbitrary, { maxLength: 4 })])(
		'popup items decode back through JSON, by the schema and the fast path alike',
		(items) => {
			const compressed = viaJson(encodeMapPopupData(items)) as ReturnType<
				typeof encodeMapPopupData
			>;

			expect(compressed.map((item) => MapPopupItemSchema.parse(item))).toStrictEqual(items);
			expect(decodeMapPopupData(compressed)).toStrictEqual(items);
		},
	);

	test('an image path the popup would prefix twice fails to encode', () => {
		for (const path of ['/a-350x233.webp', 'https://img.example.com/a-350x233.webp']) {
			expect(() =>
				z.encode(MapPopupItemSchema, {
					id: 'a',
					popupImageSources: [{ path, width: 350 }],
					title: 'A',
				}),
			).toThrow('relative to the image base URL');
		}
	});

	test('links ride without their scheme, and a Google Maps short link without its host', () => {
		const encoded = z.encode(MapPopupItemSchema, {
			googleMapsUrl: 'https://maps.app.goo.gl/abc',
			id: 'a',
			title: 'A',
			wikipediaUrl: 'https://en.wikipedia.org/wiki/A',
		});

		expect(encoded[mapPopupKeys.googleMapsUrl]).toBe('abc');
		expect(encoded[mapPopupKeys.wikipediaUrl]).toBe('en.wikipedia.org/wiki/A');
		expect(
			z.encode(MapPopupItemSchema, {
				googleMapsUrl: 'https://www.google.com/maps/place/x',
				id: 'b',
				title: 'B',
			})[mapPopupKeys.googleMapsUrl],
		).toBe('www.google.com/maps/place/x');
	});

	test.each([
		{ field: 'googleMapsUrl', url: 'https://maps.app.goo.gl/a/b' },
		{ field: 'googleMapsUrl', url: 'https://www.google.com' },
		{ field: 'googleMapsUrl', url: 'https://a.aa/://' },
		{ field: 'wikipediaUrl', url: 'https://a.aa/://' },
	] as const)(
		'$field rides whole when its short form would expand elsewhere: $url',
		({ field, url }) => {
			const item = { [field]: url, id: 'a', title: 'A' };
			const encoded = z.encode(MapPopupItemSchema, item);

			expect(encoded[mapPopupKeys[field]]).toBe(url);
			expect(MapPopupItemSchema.parse(encoded)).toStrictEqual(item);
		},
	);
});

function sourceItemOf(id: string, title: string): MapSourceItem {
	return {
		geometry: { coordinates: [100, 13], type: GeometryTypeEnum.Point },
		properties: {
			entryQuality: 1,
			hasImage: false,
			id,
			precision: 3,
			rating: 2,
			status: LocationStatusEnum.Unknown,
			title,
			url: getMapRowUrl(id),
		},
		type: 'Feature',
	};
}

describe('MapSourceItemSchema id residual', () => {
	test.each(residualCases)(
		'$form: $id encodes as "$stored" and decodes back',
		({ id, stored, title }) => {
			const standard = sourceItemOf(id, title);
			const compressed = z.encode(MapSourceItemSchema, standard);

			expect(compressed[mapSourceKeys.id]).toBe(stored);
			expect(MapSourceItemSchema.parse(compressed)).toEqual(standard);
		},
	);

	test('an id that would read as a residual throws rather than decoding to another id', () => {
		expect(() => z.encode(MapSourceItemSchema, sourceItemOf('trailing-', 'Other'))).toThrow(
			'"trailing-"',
		);
		expect(() => z.encode(MapSourceItemSchema, sourceItemOf('', 'Other'))).toThrow('""');
	});

	test('the url derives from the entry id, without the Point suffix', () => {
		const decoded = MapSourceItemSchema.parse(
			z.encode(
				MapSourceItemSchema,
				sourceItemOf('baozhong-longyan-sugar-factory:3', 'Longyan Sugar Factory: Gate'),
			),
		);

		expect(decoded.properties.url).toBe('/baozhong-longyan-sugar-factory/');
	});
});

describe('MapDirectorySchema', () => {
	test('one column per encoded key, nulls where a row omits it, all-null columns dropped', () => {
		const first = sourceItemOf('alpha', 'Alpha');
		const second = sourceItemOf('beta-gamma', 'Gamma');

		second.properties.chunkKey = '3';

		const columns = encodeMapDirectory([first, second]);

		expect(columns[mapSourceKeys.id]).toEqual(['', 'beta-']);
		expect(columns[mapSourceKeys.chunkKey]).toEqual([undefined, '3']);
		expect(columns[mapSourceKeys.geometry]).toEqual([
			[100, 13],
			[100, 13],
		]);
		expect(Object.hasOwn(columns, mapSourceKeys.objective)).toBe(false);

		const json = JSON.stringify(columns);

		expect(json).toContain(`"${mapSourceKeys.chunkKey}":[null,"3"]`);
		expect(MapDirectorySchema.parse(JSON.parse(json))).toEqual([first, second]);
	});

	test('columns of different lengths are rejected', () => {
		const columns = encodeMapDirectory([
			sourceItemOf('alpha', 'Alpha'),
			sourceItemOf('beta', 'Beta'),
		]);

		expect(
			MapDirectorySchema.safeParse({ ...columns, [mapSourceKeys.title]: ['Alpha'] }).success,
		).toBe(false);
	});

	test('Backlinks encode as row indices and decode back to ids', () => {
		const alpha = sourceItemOf('alpha', 'Alpha');
		const point = sourceItemOf('beta-gamma:1', 'Gamma');

		alpha.properties.backlinks = ['beta-gamma:1'];
		point.properties.backlinks = ['alpha'];

		const columns = encodeMapDirectory([alpha, point]);

		expect(columns[mapSourceKeys.backlinks]).toEqual([[1], [0]]);
		expect(MapDirectorySchema.parse(viaJson(columns))).toEqual([alpha, point]);
	});

	test('a Backlink to a row outside the directory throws on encode', () => {
		const alpha = sourceItemOf('alpha', 'Alpha');

		alpha.properties.backlinks = ['missing'];

		expect(() => encodeMapDirectory([alpha])).toThrow(/missing/);
	});

	test('a Backlink index out of range is rejected', () => {
		const columns = encodeMapDirectory([sourceItemOf('alpha', 'Alpha')]);

		expect(
			MapDirectorySchema.safeParse({ ...columns, [mapSourceKeys.backlinks]: [[1]] }).success,
		).toBe(false);
	});
});

// Unlike structuredClone, JSON turns `undefined` column entries into `null` as the real payload does
function viaJson(value: unknown): unknown {
	const json = JSON.stringify(value);

	return JSON.parse(json);
}

function directoryOf(rows: Array<MapSourceItem>) {
	return viaJson(encodeMapDirectory(rows)) as MapDirectoryColumns;
}
