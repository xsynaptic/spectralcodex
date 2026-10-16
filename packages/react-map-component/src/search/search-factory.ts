import type { MapInterval, MapScopeRow, MapSourceItem } from '@spectralcodex/map-codec';

import { createRuleTest } from '@spectralcodex/map-codec';

import type { MapSearchRange } from '#search/search-normalize.ts';

import { getWrittenRange, normalizeText } from '#search/search-normalize.ts';

const mapSearchLimit = 50;

export interface MapSearchText {
	ranges?: Array<MapSearchRange>;
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
	name: FieldName;
	normalized: string;
}

interface SearchEntry {
	fields: Array<SearchField>;
	key: string;
	score: number;
	source:
		| { kind: 'location'; properties: MapSourceItem['properties'] }
		| { kind: 'scope'; row: MapScopeRow };
}

interface SearchRegion {
	fields: Array<SearchField>;
	interval: MapInterval;
}

type IsInRegion = (properties: MapSourceItem['properties']) => boolean;

export interface MapSearchIndex {
	entries: Array<SearchEntry>;
	regions: Array<SearchRegion>;
	regionTitleByOrdinal: ReadonlyMap<number, string>;
}

const matchTier = { inside: 2, region: 3, start: 0, word: 1 } as const;

type MatchTier = (typeof matchTier)[keyof typeof matchTier];

interface Candidate {
	entry: SearchEntry;
	tier: MatchTier;
}

function createField(name: FieldName, text: string): SearchField {
	return { name, normalized: normalizeText(text) };
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
	const regions: Array<SearchRegion> = [];
	const regionTitleByOrdinal = new Map<number, string>();

	for (const { interval, title, titleMultilingual } of scopes) {
		if (!interval) continue;

		regions.push({ fields: getTitleFields(title, titleMultilingual), interval });
		regionTitleByOrdinal.set(interval[0], title);
	}

	return {
		entries: [...scopes.map(createScopeEntry), ...rows.map(createLocationEntry)],
		regions,
		regionTitleByOrdinal,
	};
}

function isWordStart(normalized: string, position: number) {
	return !/[\p{L}\p{N}]/u.test(normalized.charAt(position - 1));
}

function matchField(normalized: string, term: string) {
	const first = normalized.indexOf(term);

	if (first === -1) return;
	if (first === 0) return { position: first, tier: matchTier.start };

	for (let position = first; position !== -1; position = normalized.indexOf(term, position + 1)) {
		if (isWordStart(normalized, position)) return { position, tier: matchTier.word };
	}

	return { position: first, tier: matchTier.inside };
}

function matchTerm(fields: Array<SearchField>, term: string) {
	let tier: MatchTier | undefined;

	for (const { name, normalized } of fields) {
		const match = matchField(normalized, term);

		if (!match) continue;

		const fieldTier = name === 'id' ? matchTier.inside : match.tier;

		if (tier === undefined || fieldTier < tier) tier = fieldTier;
	}

	return tier;
}

// A Region counts only when the word starts one of its words, so `an` does not take in every Tainan Location
function isRegionNamedBy({ fields }: SearchRegion, term: string) {
	const tier = matchTerm(fields, term);

	return tier !== undefined && tier <= matchTier.word;
}

function getOutermostIntervals(intervals: Array<MapInterval>) {
	const sorted = intervals.toSorted(([firstLeft], [secondLeft]) => firstLeft - secondLeft);
	const outermost: Array<MapInterval> = [];
	let right = 0;

	for (const interval of sorted) {
		if (interval[0] <= right) continue;

		outermost.push(interval);
		right = interval[1];
	}

	return outermost;
}

function getRegionTests(regions: Array<SearchRegion>, term: string): Array<IsInRegion> {
	const intervals = regions
		.filter((region) => isRegionNamedBy(region, term))
		.map(({ interval }) => interval);

	return getOutermostIntervals(intervals).map((interval) =>
		createRuleTest({ interval, type: 'region' }),
	);
}

function matchEntry(
	entry: SearchEntry,
	terms: Array<string>,
	regionTestsByTerm: Array<Array<IsInRegion>>,
): Candidate | undefined {
	const { source } = entry;
	let tier: MatchTier = matchTier.start;

	for (const [termIndex, term] of terms.entries()) {
		let termTier = matchTerm(entry.fields, term);

		if (
			termTier === undefined &&
			source.kind === 'location' &&
			regionTestsByTerm[termIndex]?.some((isInRegion) => isInRegion(source.properties))
		) {
			termTier = matchTier.region;
		}

		if (termTier === undefined) return;
		if (termTier > tier) tier = termTier;
	}

	return { entry, tier };
}

function compareCandidates(first: Candidate, second: Candidate) {
	const scoreOrder = second.entry.score - first.entry.score;

	if (scoreOrder !== 0) return scoreOrder;

	const firstTitle = first.entry.fields[0]?.normalized ?? '';
	const secondTitle = second.entry.fields[0]?.normalized ?? '';

	// Not `localeCompare`, which costs too much across thousands of single-letter matches
	if (firstTitle === secondTitle) return 0;

	return firstTitle < secondTitle ? -1 : 1;
}

function rankCandidates(candidates: Iterable<Candidate>, limit: number) {
	const buckets: Array<Array<Candidate>> = Array.from(
		{ length: (matchTier.region + 1) * 2 },
		() => [],
	);

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

function getRanges(text: string, terms: Array<string>) {
	const normalized = normalizeText(text);
	const ranges: Array<MapSearchRange> = [];

	for (const term of terms) {
		const match = matchField(normalized, term);

		if (match) ranges.push(getWrittenRange(text, match.position, term.length));
	}

	ranges.sort(([firstStart], [secondStart]) => firstStart - secondStart);

	const merged: Array<MapSearchRange> = [];

	for (const range of ranges) {
		const last = merged.at(-1);

		if (last && range[0] <= last[1]) {
			merged[merged.length - 1] = [last[0], Math.max(last[1], range[1])];
			continue;
		}

		merged.push(range);
	}

	return merged;
}

function toText(text: string, terms: Array<string>): MapSearchText {
	const ranges = getRanges(text, terms);

	return ranges.length > 0 ? { ranges, text } : { text };
}

function toResult(
	{ entry }: Candidate,
	terms: Array<string>,
	regionTitleByOrdinal: MapSearchIndex['regionTitleByOrdinal'],
): MapSearchResult {
	const { source } = entry;
	const { title, titleMultilingual } = source.kind === 'scope' ? source.row : source.properties;
	const texts = {
		title: toText(title, terms),
		...(titleMultilingual ? { titleMultilingual: toText(titleMultilingual, terms) } : {}),
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
	const terms = normalizeText(query).split(/\s+/u).filter(Boolean);

	if (terms.length === 0) return;

	const regionTestsByTerm = terms.map((term) => getRegionTests(index.regions, term));
	const candidateByKey = new Map<string, Candidate>();

	for (const entry of index.entries) {
		const candidate = matchEntry(entry, terms, regionTestsByTerm);
		const current = candidateByKey.get(entry.key);

		if (candidate && (!current || candidate.tier < current.tier)) {
			candidateByKey.set(entry.key, candidate);
		}
	}

	return rankCandidates(candidateByKey.values(), mapSearchLimit).map((candidate) =>
		toResult(candidate, terms, index.regionTitleByOrdinal),
	);
}
