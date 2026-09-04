import { describe, expect, test } from 'vitest';

import { isIndexableUrlPath } from './sitemap.ts';

describe('isIndexableUrlPath', () => {
	test('accepts an ordinary content path', () => {
		expect(isIndexableUrlPath('/posts/some-post/')).toBe(true);
		expect(isIndexableUrlPath('/locations/some-location')).toBe(true);
	});

	test('rejects paginated routes', () => {
		expect(isIndexableUrlPath('/posts/2/')).toBe(false);
		expect(isIndexableUrlPath('/locations/3')).toBe(false);
	});

	test('rejects excluded prefixes, bare and with a child path', () => {
		for (const prefix of ['/objectives', '/taiwan-theater-project', '/chronology']) {
			expect(isIndexableUrlPath(prefix)).toBe(false);
			expect(isIndexableUrlPath(`${prefix}/`)).toBe(false);
			expect(isIndexableUrlPath(`${prefix}/child/`)).toBe(false);
		}
	});

	test('accepts a path that merely looks like an excluded prefix', () => {
		expect(isIndexableUrlPath('/chronologyx/')).toBe(true);
		expect(isIndexableUrlPath('/objectives-archive/')).toBe(true);
	});

	test('treats trailing-slash and bare forms identically', () => {
		expect(isIndexableUrlPath('/posts/some-post/')).toBe(isIndexableUrlPath('/posts/some-post'));
		expect(isIndexableUrlPath('/chronology/')).toBe(isIndexableUrlPath('/chronology'));
	});
});
