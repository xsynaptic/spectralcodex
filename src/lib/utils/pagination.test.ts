import type { Page } from 'astro';

import { describe, expect, test } from 'vitest';

import { getPagination } from '#lib/utils/pagination.ts';

function getUrl(pageNumber: number, trailingSlash: string) {
	return pageNumber === 1
		? `/locations${trailingSlash}`
		: `/locations/${String(pageNumber)}${trailingSlash}`;
}

function makePage(currentPage: number, lastPage: number, trailingSlash: string): Page {
	return {
		currentPage,
		data: [],
		end: 9,
		lastPage,
		size: 10,
		start: 0,
		total: lastPage * 10,
		url: {
			current: getUrl(currentPage, trailingSlash),
			first: currentPage === 1 ? undefined : getUrl(1, trailingSlash),
			last: currentPage === lastPage ? undefined : getUrl(lastPage, trailingSlash),
			next: currentPage === lastPage ? undefined : getUrl(currentPage + 1, trailingSlash),
			prev: currentPage === 1 ? undefined : getUrl(currentPage - 1, trailingSlash),
		},
	};
}

describe.each([
	{ shape: 'bare, as dev paginates', trailingSlash: '' },
	{ shape: 'slashed, as production paginates', trailingSlash: '/' },
])('getPagination with $shape urls', ({ trailingSlash }) => {
	test('page 1 normalizes every option to the trailing-slash form', () => {
		const pagination = getPagination(makePage(1, 3, trailingSlash));

		expect(pagination.options.at(0)?.url).toBe('/locations/');
		expect(pagination.options.at(2)?.url).toBe('/locations/3/');
		expect(pagination.previous).toBeUndefined();
		expect(pagination.next?.url).toBe('/locations/2/');
	});

	test('a middle page marks only itself current and links back to the unnumbered first page', () => {
		const pagination = getPagination(makePage(2, 3, trailingSlash));

		expect(
			pagination.options.filter((option) => option.isCurrent).map((option) => option.url),
		).toStrictEqual(['/locations/2/']);
		expect(pagination.previous?.url).toBe('/locations/');
	});
});
