import { describe, expect, test } from 'vitest';

import { hasEntryContent } from '#lib/utils/astro.ts';

type ContentEntry = Parameters<typeof hasEntryContent>[0];

// The collection entry type is inferred off the content layer; only `body` matters here
const entry = (body?: unknown) =>
	({ ...(body === undefined ? {} : { body }) }) as unknown as ContentEntry;

describe('hasEntryContent', () => {
	test('a body with prose counts as content', () => {
		expect(hasEntryContent(entry('Some prose.'))).toBe(true);
	});

	test('a whitespace-only body does not', () => {
		expect(hasEntryContent(entry(' \n\t '))).toBe(false);
		expect(hasEntryContent(entry(''))).toBe(false);
	});

	test('an entry with no body at all does not', () => {
		expect(hasEntryContent(entry())).toBe(false);
	});

	test('a body that is not a string does not', () => {
		expect(hasEntryContent(entry(42))).toBe(false);
	});
});
