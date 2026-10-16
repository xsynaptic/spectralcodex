import type { MapScopeRow, MapSourceItem } from '@spectralcodex/map-codec';

const mapSearchLimit = 50;

type MapSearchRange = readonly [start: number, end: number];

export interface MapSearchText {
	match?: MapSearchRange;
	text: string;
}

interface MapSearchResultBase {
	key: string;
	parentTitle?: string;
	title: MapSearchText;
	titleMultilingual?: MapSearchText;
}

export type MapSearchResult =
	| (MapSearchResultBase & { count: number; kind: MapScopeRow['kind']; url: string })
	| (MapSearchResultBase & { kind: 'location'; pointId: string });

type FieldName = 'id' | 'title' | 'titleMultilingual';

interface SearchField {
	folded: string;
	name: FieldName;
	text: string;
}

interface SearchEntry {
	fields: Array<SearchField>;
	key: string;
	score: number;
	source:
		| { kind: 'location'; properties: MapSourceItem['properties'] }
		| { kind: 'scope'; row: MapScopeRow };
}

export interface MapSearchIndex {
	entries: Array<SearchEntry>;
	regionTitleByOrdinal: ReadonlyMap<number, string>;
}

const matchTier = { inside: 2, start: 0, word: 1 } as const;

type MatchTier = (typeof matchTier)[keyof typeof matchTier];

interface Candidate {
	entry: SearchEntry;
	positionByName: Map<FieldName, number>;
	tier: MatchTier;
}

const droppedCharacters = new Set(["'", '‘', '’', 'ʻ', 'ʼ']);
const replacedCharacters = new Map([['đ', 'd']]);
const foldedCharacterCache = new Map<string, string>();

function foldCharacter(character: string) {
	const cached = foldedCharacterCache.get(character);

	if (cached !== undefined) return cached;

	// Marks fold only on a Latin base: in Thai they are vowels and tones that make the word
	const lowered = character
		.normalize('NFD')
		.replace(/^(\p{Script=Latin})\p{M}+$/u, '$1')
		.toLowerCase();
	const folded = droppedCharacters.has(character)
		? ''
		: (replacedCharacters.get(lowered) ?? lowered);

	foldedCharacterCache.set(character, folded);

	return folded;
}

function foldText(text: string) {
	let folded = '';

	for (const character of text) {
		folded += foldCharacter(character);
	}

	return folded;
}

function createField(name: FieldName, text: string): SearchField {
	return { folded: foldText(text), name, text };
}

function getRange(text: string, position: number, length: number): MapSearchRange {
	const starts: Array<number> = [];
	const ends: Array<number> = [];
	let start = 0;

	for (const character of text) {
		const end = start + character.length;

		for (let units = foldCharacter(character).length; units > 0; units -= 1) {
			starts.push(start);
			ends.push(end);
		}

		start = end;
	}

	const rangeStart = starts[position] ?? 0;

	return [rangeStart, ends[position + length - 1] ?? rangeStart];
}

function getTitleFields(title: string, titleMultilingual: string | undefined) {
	const fields = [createField('title', title)];

	if (titleMultilingual) fields.push(createField('titleMultilingual', titleMultilingual));

	return fields;
}

function createScopeEntry(row: MapScopeRow): SearchEntry {
	const fields = [
		...getTitleFields(row.title, row.titleMultilingual),
		createField('id', row.id.replaceAll('-', ' ')),
	];

	return { fields, key: `${row.kind}-${row.id}`, score: row.count, source: { kind: 'scope', row } };
}

function createLocationEntry({ properties }: MapSourceItem): SearchEntry {
	const { entryQuality, id, rating, title, titleMultilingual, url } = properties;

	return {
		fields: getTitleFields(title, titleMultilingual),
		key: `location-${url ?? id}`,
		score: entryQuality + rating,
		source: { kind: 'location', properties },
	};
}

export function createSearchIndex(
	rows: ReadonlyArray<MapSourceItem>,
	scopes: ReadonlyArray<MapScopeRow>,
): MapSearchIndex {
	const regionTitleByOrdinal = new Map<number, string>();

	for (const { ordinal, title } of scopes) {
		if (ordinal !== undefined) regionTitleByOrdinal.set(ordinal, title);
	}

	return {
		entries: [...scopes.map(createScopeEntry), ...rows.map(createLocationEntry)],
		regionTitleByOrdinal,
	};
}

function isWordStart(folded: string, position: number) {
	return !/[\p{L}\p{N}]/u.test(folded.charAt(position - 1));
}

function matchField(folded: string, query: string) {
	const first = folded.indexOf(query);

	if (first === -1) return;
	if (first === 0) return { position: first, tier: matchTier.start };

	for (let position = first; position !== -1; position = folded.indexOf(query, position + 1)) {
		if (isWordStart(folded, position)) return { position, tier: matchTier.word };
	}

	return { position: first, tier: matchTier.inside };
}

function matchEntry(entry: SearchEntry, query: string): Candidate | undefined {
	const positionByName = new Map<FieldName, number>();
	let tier: MatchTier = matchTier.inside;

	for (const { folded, name } of entry.fields) {
		const match = matchField(folded, query);

		if (!match) continue;

		const fieldTier = name === 'id' ? matchTier.inside : match.tier;

		if (fieldTier < tier) tier = fieldTier;

		positionByName.set(name, match.position);
	}

	return positionByName.size > 0 ? { entry, positionByName, tier } : undefined;
}

function compareCandidates(first: Candidate, second: Candidate) {
	const scoreOrder = second.entry.score - first.entry.score;

	if (scoreOrder !== 0) return scoreOrder;

	const firstTitle = first.entry.fields[0]?.folded ?? '';
	const secondTitle = second.entry.fields[0]?.folded ?? '';

	// Not `localeCompare`, which costs too much across thousands of single-letter matches
	if (firstTitle === secondTitle) return 0;

	return firstTitle < secondTitle ? -1 : 1;
}

function rankCandidates(candidates: Iterable<Candidate>, limit: number) {
	const buckets: Array<Array<Candidate>> = Array.from({ length: 6 }, () => []);

	for (const candidate of candidates) {
		const isLocation = candidate.entry.source.kind === 'location';

		buckets[candidate.tier * 2 + (isLocation ? 1 : 0)]?.push(candidate);
	}

	const ranked: Array<Candidate> = [];

	for (const bucket of buckets) {
		if (ranked.length >= limit) break;

		ranked.push(...bucket.toSorted(compareCandidates).slice(0, limit - ranked.length));
	}

	return ranked;
}

function getParentTitle(
	regionTitleByOrdinal: MapSearchIndex['regionTitleByOrdinal'],
	regionOrdinals: ReadonlyArray<number> = [],
) {
	for (const ordinal of regionOrdinals) {
		const title = regionTitleByOrdinal.get(ordinal);

		if (title !== undefined) return title;
	}

	return;
}

function toResult(
	{ entry, positionByName }: Candidate,
	length: number,
	regionTitleByOrdinal: MapSearchIndex['regionTitleByOrdinal'],
): MapSearchResult {
	function toText(name: FieldName, text: string): MapSearchText {
		const position = positionByName.get(name);

		return position === undefined ? { text } : { match: getRange(text, position, length), text };
	}

	const { source } = entry;
	const { title, titleMultilingual } = source.kind === 'scope' ? source.row : source.properties;
	const texts = {
		title: toText('title', title),
		...(titleMultilingual
			? { titleMultilingual: toText('titleMultilingual', titleMultilingual) }
			: {}),
	};

	if (source.kind === 'scope') {
		const { count, kind, parentTitle, url } = source.row;

		return { ...texts, count, key: entry.key, kind, url, ...(parentTitle ? { parentTitle } : {}) };
	}

	const parentTitle = getParentTitle(regionTitleByOrdinal, source.properties.regionOrdinals);

	return {
		...texts,
		key: entry.key,
		kind: 'location',
		pointId: source.properties.id,
		...(parentTitle ? { parentTitle } : {}),
	};
}

export function searchMap(index: MapSearchIndex, query: string) {
	const folded = foldText(query.trim().replaceAll(/\s+/g, ' '));

	if (folded === '') return [];

	const candidateByKey = new Map<string, Candidate>();

	for (const entry of index.entries) {
		const candidate = matchEntry(entry, folded);
		const current = candidateByKey.get(entry.key);

		if (candidate && (!current || candidate.tier < current.tier)) {
			candidateByKey.set(entry.key, candidate);
		}
	}

	return rankCandidates(candidateByKey.values(), mapSearchLimit).map((candidate) =>
		toResult(candidate, folded.length, index.regionTitleByOrdinal),
	);
}
