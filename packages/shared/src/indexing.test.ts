import { describe, expect, test } from 'vitest';

import { getUrlPathIndexing } from '#indexing.ts';

describe('getUrlPathIndexing', () => {
	test('indexes and follows an ordinary content path', () => {
		expect(getUrlPathIndexing('/posts/some-post/')).toStrictEqual({ follow: true, index: true });
		expect(getUrlPathIndexing('/locations/some-location')).toStrictEqual({
			follow: true,
			index: true,
		});
	});

	test('follows but does not index paginated routes', () => {
		expect(getUrlPathIndexing('/posts/2/')).toStrictEqual({ follow: true, index: false });
		expect(getUrlPathIndexing('/regions/taiwan/3')).toStrictEqual({ follow: true, index: false });
	});

	test('neither indexes nor follows excluded prefixes, bare and with a child path', () => {
		for (const prefix of ['/objectives', '/taiwan-theater-project', '/chronology']) {
			expect(getUrlPathIndexing(prefix)).toStrictEqual({ follow: false, index: false });
			expect(getUrlPathIndexing(`${prefix}/`)).toStrictEqual({ follow: false, index: false });
			expect(getUrlPathIndexing(`${prefix}/child/`)).toStrictEqual({ follow: false, index: false });
		}
	});

	test('an excluded prefix outranks the pagination rule', () => {
		expect(getUrlPathIndexing('/chronology/2024/')).toStrictEqual({ follow: false, index: false });
	});

	test('indexes a path that merely looks like an excluded prefix', () => {
		expect(getUrlPathIndexing('/chronologyx/').index).toBe(true);
		expect(getUrlPathIndexing('/objectives-archive/').index).toBe(true);
	});

	test('treats trailing-slash and bare forms identically', () => {
		expect(getUrlPathIndexing('/posts/some-post/')).toStrictEqual(
			getUrlPathIndexing('/posts/some-post'),
		);
		expect(getUrlPathIndexing('/chronology/')).toStrictEqual(getUrlPathIndexing('/chronology'));
	});
});
