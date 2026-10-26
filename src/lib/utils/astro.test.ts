import { describe, expect, test } from 'vitest';

import { hasEntryContent } from '#lib/utils/astro.ts';

type ContentEntry = Parameters<typeof hasEntryContent>[0];

// The collection entry type is inferred off the content layer; only `body` matters here
const entry = (body?: unknown) =>
	({ ...(body === undefined ? {} : { body }) }) as unknown as ContentEntry;

describe('hasEntryContent', () => {
	test.each([
		{ body: 'Some prose.', expected: true, shape: 'a body with prose' },
		{ body: ' \n\t ', expected: false, shape: 'a whitespace-only body' },
		{ body: '', expected: false, shape: 'an empty body' },
		{ body: undefined, expected: false, shape: 'no body at all' },
		{ body: 42, expected: false, shape: 'a body that is not a string' },
	])('$shape: $expected', ({ body, expected }) => {
		expect(hasEntryContent(entry(body))).toBe(expected);
	});
});
