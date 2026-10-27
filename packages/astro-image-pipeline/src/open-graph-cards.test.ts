import { describe, expect, test } from 'vitest';

import type { OpenGraphCardInput, OpenGraphCardValue } from '#open-graph-cards.ts';

import { canonicalizeOpenGraphCard, defineOpenGraphCards } from '#open-graph-cards.ts';

const openGraphCards = defineOpenGraphCards({ format: 'jpg' });

function unsorted(entries: Array<[string, OpenGraphCardValue | undefined]>): OpenGraphCardInput {
	return Object.fromEntries(entries);
}

describe('getCardName', () => {
	test('names a card by its id and format', () => {
		expect(openGraphCards.getCardName({ id: 'index-atlas', input: { title: 'Atlas' } })).toBe(
			'index-atlas.jpg',
		);
	});

	test.each(['a b', '../escape', 'a/./b', 'quote"d'])('refuses %j as an id', (id) => {
		expect(() => openGraphCards.getCardName({ id, input: {} })).toThrow("can't be named");
	});
});

describe('canonicalizeOpenGraphCard', () => {
	test('sorts nested keys and drops undefined at every depth', () => {
		const card = canonicalizeOpenGraphCard({
			input: unsorted([
				[
					'b',
					[
						unsorted([
							['y', 1],
							['x', undefined],
							['w', 2],
						]),
					],
				],
				[
					'a',
					unsorted([
						['d', undefined],
						['c', true],
					]),
				],
			]),
		});

		expect(JSON.stringify(card)).toBe('{"input":{"a":{"c":true},"b":[{"w":2,"y":1}]}}');
	});

	test.each([NaN, Infinity])('refuses %s, which JSON would turn into null', (value) => {
		expect(() => canonicalizeOpenGraphCard({ input: { value } })).toThrow(
			'JSON has no such number',
		);
	});
});
