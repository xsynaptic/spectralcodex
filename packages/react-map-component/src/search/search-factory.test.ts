import type { MapInterval, MapScopeRow, MapSourceItem } from '@spectralcodex/map-codec';

import { fc, test } from '@fast-check/vitest';
import { describe, expect } from 'vitest';

import type { MapSearchText } from '#search/search-factory.ts';

import { makeMapSourceItem } from '#lib/map-test-utils.ts';
import { createSearchIndex, searchMap } from '#search/search-factory.ts';
import { normalizeText } from '#search/search-normalize.ts';

function makeRow(
	id: string,
	title: string,
	properties: Partial<MapSourceItem['properties']> = {},
): MapSourceItem {
	return makeMapSourceItem({ id, rating: 1, title, url: `/${id}/`, ...properties });
}

function makeScope(id: string, title: string, row: Partial<MapScopeRow> = {}): MapScopeRow {
	return { count: 1, id, kind: 'region', title, url: `/regions/${id}/`, ...row };
}

function getTitles(rows: Array<MapSourceItem>, scopes: Array<MapScopeRow>, query: string) {
	return searchMap(createSearchIndex(rows, scopes), query)?.map(({ title }) => title.text);
}

const titleCharacterArbitrary = fc.oneof(
	{ arbitrary: fc.constantFrom('a', 'B', 'z', '1', ' ', ' '), weight: 4 },
	{ arbitrary: fc.constantFrom("'", '’', 'ʻ', '\u{301}', '\u{E35}'), weight: 2 },
	{ arbitrary: fc.constantFrom('Đ', 'đ', 'ộ', 'É', 'İ', 'ẞ', '臺', '台', 'ดี'), weight: 2 },
	{ arbitrary: fc.constantFrom('𠮷', '👍', '\u{958}', '\u{FB2C}'), weight: 2 },
	{ arbitrary: fc.constantFrom('क', '\u{93C}', 'ש', '\u{5BC}', '\u{D842}', '\u{DFB7}'), weight: 2 },
	{ arbitrary: fc.string({ maxLength: 1, minLength: 1, unit: 'binary' }), weight: 1 },
);

const titleAndQueryArbitrary = fc
	.array(titleCharacterArbitrary, { maxLength: 16, minLength: 1 })
	.chain((characters) => {
		const sliceArbitrary = fc
			.tuple(fc.nat(characters.length), fc.nat(characters.length))
			.map(([first, second]) =>
				characters.slice(Math.min(first, second), Math.max(first, second)).join(''),
			);

		return fc.record({
			query: fc
				.array(sliceArbitrary, { maxLength: 3, minLength: 1 })
				.map((slices) => slices.join(' ')),
			title: fc.constant(characters.join('')),
		});
	});

function getHighlightParts({ ranges = [], text }: MapSearchText) {
	const parts: Array<{ isMark: boolean; start: number; text: string }> = [];
	let cursor = 0;

	for (const [start, end] of ranges) {
		parts.push(
			{ isMark: false, start: cursor, text: text.slice(cursor, start) },
			{ isMark: true, start, text: text.slice(start, end) },
		);
		cursor = end;
	}

	parts.push({ isMark: false, start: cursor, text: text.slice(cursor) });

	return parts;
}

function getFoldedCharacters(text: string) {
	const characters: Array<{ end: number; foldedEnd: number; foldedStart: number; start: number }> =
		[];
	let start = 0;
	let foldedStart = 0;

	for (const character of text) {
		const foldedEnd = foldedStart + normalizeText(character).length;

		characters.push({ end: start + character.length, foldedEnd, foldedStart, start });
		start += character.length;
		foldedStart = foldedEnd;
	}

	return characters;
}

function getTermSpans(normalized: string, terms: Array<string>) {
	const spans: Array<readonly [number, number]> = [];

	for (const term of terms) {
		for (
			let position = normalized.indexOf(term);
			position !== -1;
			position = normalized.indexOf(term, position + 1)
		) {
			spans.push([position, position + term.length]);
		}
	}

	return spans;
}

describe('searchMap highlights', () => {
	test.prop([titleAndQueryArbitrary])(
		'mark whole characters of a match, and the parts reassemble the title',
		({ query, title }) => {
			const terms = normalizeText(query).split(/\s+/u).filter(Boolean);
			const results = searchMap(createSearchIndex([makeRow('row', title)], []), query);

			if (terms.length === 0) {
				expect(results).toBeUndefined();
				return;
			}

			expect(results).toHaveLength(1);

			const parts = getHighlightParts(results![0]!.title);
			const marks = parts.filter(({ isMark }) => isMark);
			const characters = getFoldedCharacters(title);
			const termSpans = getTermSpans(normalizeText(title), terms);

			expect(parts.map((part) => part.text).join('')).toBe(title);
			expect(parts.slice(1, -1).every((part) => part.text !== '')).toBe(true);

			for (const term of terms) {
				expect(
					marks.some((mark) => normalizeText(mark.text).includes(term)),
					term,
				).toBe(true);
			}

			for (const mark of marks) {
				const markCharacters = characters.filter(
					({ end, start }) => start >= mark.start && end <= mark.start + mark.text.length,
				);
				const isInTerm = ({ foldedEnd, foldedStart }: (typeof characters)[number]) =>
					termSpans.some(([spanStart, spanEnd]) => spanStart < foldedEnd && foldedStart < spanEnd);

				expect(markCharacters.map(({ end, start }) => title.slice(start, end)).join('')).toBe(
					mark.text,
				);
				expect(isInTerm(markCharacters[0]!) && isInTerm(markCharacters.at(-1)!)).toBe(true);
				expect(
					markCharacters.every(
						(character) => character.foldedStart === character.foldedEnd || isInTerm(character),
					),
				).toBe(true);
			}
		},
	);
});

// Any closed interval, empty ones included, since `MapInterval` admits them
const intervalArbitrary = fc.tuple(fc.nat(12), fc.nat(12));

// The first two named intervals partly overlap, and `reach` lies only in the second
const namedRegionsArbitrary = fc
	.record({
		extraNamed: fc.array(intervalArbitrary, { maxLength: 5 }),
		length: fc.nat(4),
		overhang: fc.integer({ max: 4, min: 1 }),
		shift: fc.nat(4),
		start: fc.nat(8),
		unnamed: fc.array(intervalArbitrary, { maxLength: 3 }),
	})
	.chain(({ extraNamed, length, overhang, shift, start, unnamed }) => {
		const first: MapInterval = [start, start + length];
		const second: MapInterval = [start + Math.min(shift, length), start + length + overhang];
		const scopes = [
			...[first, second, ...extraNamed].map((interval) => ({ interval, isNamed: true })),
			...unnamed.map((interval) => ({ interval, isNamed: false })),
		];

		return fc.record({
			locationOrdinals: fc.array(fc.uniqueArray(fc.nat(20), { maxLength: 3 }), { maxLength: 8 }),
			reach: fc.constant(second[1]),
			scopes: fc.shuffledSubarray(scopes, { maxLength: scopes.length, minLength: scopes.length }),
		});
	});

describe('searchMap', () => {
	test('a query matches across case, marks, đ and apostrophes', () => {
		const rows = [makeRow('da-nang', 'Đà Nẵng'), makeRow('ohare', "O'Hare")];

		expect(getTitles(rows, [], 'DA NANG')).toEqual(['Đà Nẵng']);
		expect(getTitles(rows, [], 'ohare')).toEqual(["O'Hare"]);
	});

	test('Thai marks are letters, not diacritics', () => {
		const rows = [makeRow('di', 'ดี'), makeRow('du', 'ดุ')];

		expect(getTitles(rows, [], 'ดี')).toEqual(['ดี']);
	});

	test('a title that starts with the query leads one with a word that does, whatever their weight', () => {
		const rows = [
			makeRow('a', 'Old Salt Field', { rating: 5 }),
			makeRow('b', 'Salt Museum'),
			makeRow('c', 'Saltworks', { rating: 3 }),
		];

		expect(getTitles(rows, [], 'salt')).toEqual(['Saltworks', 'Salt Museum', 'Old Salt Field']);
		expect(getTitles(rows, [], 'works')).toEqual(['Saltworks']);
	});

	test('a Scope row leads the Locations of its tier, and each kind ranks by its own weight', () => {
		const rows = [
			makeRow('stub', 'Tainan Stub', { entryQuality: 1, rating: 5 }),
			makeRow('written', 'Tainan Theater', { entryQuality: 5, rating: 2 }),
		];
		const scopes = [
			makeScope('tainan', 'Tainan', { count: 1 }),
			makeScope('tainan-old', 'Tainan Old Town', { count: 2 }),
		];

		expect(getTitles(rows, scopes, 'tainan')).toEqual([
			'Tainan Old Town',
			'Tainan',
			'Tainan Theater',
			'Tainan Stub',
		]);
	});

	test('every word must match, in any order, each highlighted where it lands', () => {
		const rows = [makeRow('mine', 'Xindian Taiyi Coal Mine'), makeRow('hall', 'Taiyi Hall')];
		const [result, ...rest] = searchMap(createSearchIndex(rows, []), 'mine taiyi') ?? [];

		expect(rest).toEqual([]);
		expect(result?.title).toEqual({
			ranges: [
				[8, 13],
				[19, 23],
			],
			text: 'Xindian Taiyi Coal Mine',
		});
	});

	test('a word that starts a Region title takes in the Locations inside it, below a title match', () => {
		const rows = [
			makeRow('mazu', 'Grand Mazu Temple', { rating: 5, regionOrdinals: [8] }),
			makeRow('confucian', 'Tainan Confucian Temple', { regionOrdinals: [8] }),
			makeRow('lukang', 'Lukang Longshan Temple', { regionOrdinals: [20] }),
		];
		const scopes = [makeScope('tainan', 'Tainan', { interval: [7, 10] })];

		expect(getTitles(rows, scopes, 'temple tainan')).toEqual([
			'Tainan Confucian Temple',
			'Grand Mazu Temple',
		]);
		expect(getTitles(rows, scopes, 'nan temple')).toEqual(['Tainan Confucian Temple']);
	});

	test('when the query names a Region and one inside it, the outer Region still takes in all its Locations', () => {
		const rows = [
			makeRow('fort', 'Fort Zeelandia', { regionOrdinals: [8] }),
			makeRow('salt', 'Qigu Salt Mountain', { regionOrdinals: [10] }),
		];
		const scopes = [
			makeScope('tainan', 'Tainan', { interval: [7, 10] }),
			makeScope('tainan-old', 'Tainan Old Town', { interval: [8, 9] }),
		];

		expect(getTitles(rows, scopes, 'tainan')).toEqual([
			'Tainan',
			'Tainan Old Town',
			'Fort Zeelandia',
			'Qigu Salt Mountain',
		]);
	});

	test.prop([namedRegionsArbitrary])(
		'merging the named Regions never changes which Locations a term takes in',
		({ locationOrdinals, reach, scopes }) => {
			const scopeRows = scopes.map(({ interval, isNamed }, index) =>
				makeScope(`region-${String(index)}`, `${isNamed ? 'Tainan' : 'Region'} ${String(index)}`, {
					interval,
				}),
			);
			const ordinalsById = new Map([
				['reach', [reach]],
				...locationOrdinals.map((ordinals, index) => [`place-${String(index)}`, ordinals] as const),
			]);
			const rows = [...ordinalsById].map(([id, regionOrdinals]) =>
				makeRow(id, 'Place', regionOrdinals.length > 0 ? { regionOrdinals } : {}),
			);
			const takenIn = new Set(
				searchMap(createSearchIndex(rows, scopeRows), 'tainan')?.flatMap((result) =>
					result.kind === 'location' ? [result.pointId] : [],
				),
			);
			const namedIntervals = scopes
				.filter(({ isNamed }) => isNamed)
				.map(({ interval }) => interval);

			expect(takenIn.has('reach')).toBe(true);

			for (const [id, regionOrdinals] of ordinalsById) {
				expect(takenIn.has(id), id).toBe(
					regionOrdinals.some((ordinal) =>
						namedIntervals.some(([left, right]) => ordinal >= left && ordinal <= right),
					),
				);
			}
		},
	);

	test('臺 and 台 find each other, as do the other variant forms in the titles', () => {
		const rows = [
			makeRow('temple', 'Temple', { titleMultilingual: '臺南孔廟' }),
			makeRow('mine', 'Gold Mine', { titleMultilingual: '牡丹坑金鑛' }),
		];

		expect(getTitles(rows, [], '台南')).toEqual(['Temple']);
		expect(getTitles(rows, [], '金礦')).toEqual(['Gold Mine']);
	});

	describe('a Location with several Points', () => {
		const rows = [
			makeRow('budai-saltworks:0', 'Budai Saltworks', {
				pointTitle: 'Salt Pans',
				pointTitleMultilingual: '鹽田',
				regionOrdinals: [8],
				titleMultilingual: '布袋鹽場',
				url: '/budai-saltworks/',
			}),
			makeRow('budai-saltworks:1', 'Budai Saltworks', {
				pointTitle: 'Zhounan Saltworks',
				regionOrdinals: [8],
				titleMultilingual: '布袋鹽場',
				url: '/budai-saltworks/',
			}),
		];
		const index = createSearchIndex(rows, [makeScope('chiayi', 'Chiayi', { interval: [7, 10] })]);

		test('lists the Location under its own titles, then each Point after it', () => {
			const results = searchMap(index, 'budai') ?? [];

			expect(
				results.map(({ title, titleMultilingual }) => [title.text, titleMultilingual?.text]),
			).toEqual([
				['Budai Saltworks', '布袋鹽場'],
				['Budai Saltworks: Salt Pans', '布袋鹽場：鹽田'],
				['Budai Saltworks: Zhounan Saltworks', '布袋鹽場'],
			]);
			expect(results.map((result) => result.kind === 'location' && result.pointId)).toEqual([
				'budai-saltworks:0',
				'budai-saltworks:0',
				'budai-saltworks:1',
			]);
		});

		test('a Point is found by its own words, and the words may fall in either title', () => {
			expect(getTitles(rows, [], 'zhounan')).toEqual(['Budai Saltworks: Zhounan Saltworks']);
			expect(searchMap(index, 'budai pans')?.map(({ title }) => title)).toEqual([
				{
					ranges: [
						[0, 5],
						[22, 26],
					],
					text: 'Budai Saltworks: Salt Pans',
				},
			]);
		});

		test('a Region word takes in the Location but not its Points', () => {
			expect(searchMap(index, 'chiayi')?.map(({ title }) => title.text)).toEqual([
				'Chiayi',
				'Budai Saltworks',
			]);
		});
	});

	test.each([
		{
			query: '孔廟',
			range: [2, 4],
			title: 'Temple',
			titleMultilingual: '臺南孔廟',
		},
		{
			query: 'kinh',
			range: [0, 4],
			title: 'Hue Citadel (North Gate)',
			titleMultilingual: 'Kinh thanh Hue',
		},
	])(
		'a Multilingual Title is its own field, highlighted in its own text: $titleMultilingual',
		({ query, range, title, titleMultilingual }) => {
			const [result] =
				searchMap(createSearchIndex([makeRow('row', title, { titleMultilingual })], []), query) ??
				[];

			expect(result?.title).toEqual({ text: title });
			expect(result?.titleMultilingual).toEqual({ ranges: [range], text: titleMultilingual });
		},
	);

	test('a highlight covers the written characters a folded match came from', () => {
		const [result] = searchMap(createSearchIndex([makeRow('hoi-an', 'Hội An')], []), 'hoi') ?? [];

		expect(result?.title.ranges).toEqual([[0, 3]]);
	});

	test.each(['𠮷 haleiwa', 'haleiwa 𠮷'])(
		'highlights take in a dropped apostrophe and a surrogate pair, whatever the word order: %s',
		(query) => {
			const [result] =
				searchMap(createSearchIndex([makeRow('haleiwa', "Hale'iwa 𠮷")], []), query) ?? [];

			expect(result?.title.ranges).toEqual([
				[0, 8],
				[9, 11],
			]);
		},
	);

	test('a match on a Scope slug alone ranks as a mid-word match', () => {
		const rows = [makeRow('a', 'Ancient Cityscape')];
		const scopes = [makeScope('city-god', 'Chenghuang Temples')];

		expect(getTitles(rows, scopes, 'city')).toEqual(['Ancient Cityscape', 'Chenghuang Temples']);
	});

	test('a Location names the first of its Regions the Scope list knows', () => {
		const rows = [makeRow('a', 'Fort Zeelandia', { regionOrdinals: [99, 7] })];
		const scopes = [makeScope('anping', 'Anping', { interval: [7, 8] })];

		expect(searchMap(createSearchIndex(rows, scopes), 'fort')?.[0]).toMatchObject({
			kind: 'location',
			parentTitle: 'Anping',
			pointId: 'a',
		});
	});

	test('a query with no terms lists nothing, and a long list stops at fifty rows', () => {
		const rows = Array.from({ length: 60 }, (_, index) => makeRow(`row-${String(index)}`, 'Mill'));
		const index = createSearchIndex(rows, []);

		expect(searchMap(index, ' '.repeat(3))).toBeUndefined();
		expect(searchMap(index, "'")).toBeUndefined();
		expect(searchMap(index, 'mill')).toHaveLength(50);
	});
});
