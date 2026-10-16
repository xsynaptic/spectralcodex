import { stripDiacritics } from '@spectralcodex/shared/text';

export type MapSearchRange = readonly [start: number, end: number];

const droppedCharacters = new Set(["'", '‘', '’', 'ʻ', 'ʼ']);
// The rarer form in the titles normalizes to the one most titles use
const variantCharacters = new Map([
	['đ', 'd'],
	['国', '國'],
	['峯', '峰'],
	['臺', '台'],
	['舘', '館'],
	['鉱', '礦'],
	['鑛', '礦'],
	['黄', '黃'],
]);
const normalizedCharacterCache = new Map<string, string>();

function normalizeCharacter(character: string) {
	const cached = normalizedCharacterCache.get(character);

	if (cached !== undefined) return cached;

	const lowered = stripDiacritics(character).toLowerCase();
	const normalized = droppedCharacters.has(character)
		? ''
		: (variantCharacters.get(lowered) ?? lowered);

	normalizedCharacterCache.set(character, normalized);

	return normalized;
}

export function normalizeText(text: string) {
	let normalized = '';

	for (const character of text) {
		normalized += normalizeCharacter(character);
	}

	return normalized;
}

export function getWrittenRange(text: string, position: number, length: number): MapSearchRange {
	const starts: Array<number> = [];
	const ends: Array<number> = [];
	let start = 0;

	for (const character of text) {
		const end = start + character.length;

		for (let units = normalizeCharacter(character).length; units > 0; units -= 1) {
			starts.push(start);
			ends.push(end);
		}

		start = end;
	}

	const rangeStart = starts[position] ?? 0;

	return [rangeStart, ends[position + length - 1] ?? rangeStart];
}
