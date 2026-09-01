import { isIndexableUrlPath } from './sitemap.ts';

describe('isIndexableUrlPath', () => {
	it('accepts an ordinary content path', () => {
		expect(isIndexableUrlPath('/posts/some-post/')).toBe(true);
		expect(isIndexableUrlPath('/locations/some-location')).toBe(true);
	});

	it('rejects paginated routes', () => {
		expect(isIndexableUrlPath('/posts/2/')).toBe(false);
		expect(isIndexableUrlPath('/locations/3')).toBe(false);
	});

	it('rejects excluded prefixes, bare and with a child path', () => {
		for (const prefix of ['/objectives', '/planning', '/taiwan-theater-project', '/chronology']) {
			expect(isIndexableUrlPath(prefix)).toBe(false);
			expect(isIndexableUrlPath(`${prefix}/`)).toBe(false);
			expect(isIndexableUrlPath(`${prefix}/child/`)).toBe(false);
		}
	});

	it('accepts a path that merely looks like an excluded prefix', () => {
		expect(isIndexableUrlPath('/planningx/')).toBe(true);
		expect(isIndexableUrlPath('/objectives-archive/')).toBe(true);
	});

	it('treats trailing-slash and bare forms identically', () => {
		expect(isIndexableUrlPath('/posts/some-post/')).toBe(isIndexableUrlPath('/posts/some-post'));
		expect(isIndexableUrlPath('/planning/')).toBe(isIndexableUrlPath('/planning'));
	});
});
