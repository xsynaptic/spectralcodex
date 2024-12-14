import * as R from 'remeda';
import urlJoin from 'url-join';

import type { Page } from 'astro';

import { getSiteUrl } from '@/lib/utils/routing';

interface PaginationData {
	getPageNumberLink: (pageNumber: number) => string;
	pagePrevLink: string | undefined;
	pageNextLink: string | undefined;
	pageArray: number[];
}

/**
 * This function adapted from a comment found on this popular gist
 * Note: `-1` is converted to a divider (...) at the component level
 * @link https://gist.github.com/kottenator/9d936eb3e4e3c3e02598?permalink_comment_id=4215826#gistcomment-4215826
 */
function getPageNumberArray({
	currentPage,
	pageCount,
	pagesShown,
	minimumPagesShown = 5,
}: {
	currentPage: number;
	pageCount: number;
	pagesShown: number;
	minimumPagesShown?: number;
}) {
	let delta: number;

	const centerPagesShown = pagesShown - 5;
	const boundaryPagesShown = pagesShown - 3;

	currentPage = R.clamp(currentPage, { min: 1, max: pageCount });
	pagesShown = R.clamp(pagesShown, { min: minimumPagesShown, max: pageCount });

	if (pageCount <= pagesShown) {
		delta = pagesShown;
	} else {
		delta =
			currentPage < boundaryPagesShown || currentPage > pageCount - boundaryPagesShown
				? boundaryPagesShown
				: centerPagesShown;
	}

	const range = {
		start: Math.round(currentPage - delta / 2),
		end: Math.round(currentPage + delta / 2),
	};

	if (range.start - 1 === 1 || range.end + 1 === pageCount) {
		range.start += 1;
		range.end += 1;
	}

	let pages =
		currentPage > delta
			? R.range(Math.min(range.start, pageCount - delta), Math.min(range.end, pageCount) + 1)
			: R.range(1, Math.min(pageCount, delta + 1) + 1);

	if (currentPage > pageCount - boundaryPagesShown && pageCount > pagesShown) {
		pages = R.range(pageCount - delta, pageCount + 1);
	}

	const withDots = (value: number, pair: number[]) =>
		pages.length + 1 === pageCount ? [value] : pair;

	const lastPage = pages.at(-1);

	if (pages.at(0) !== 1) {
		pages = [...withDots(1, [1, -1]), ...pages];
	}

	if (lastPage && lastPage < pageCount) {
		pages = [...pages, ...withDots(pageCount, [-1, pageCount])];
	}

	return pages;
}

export function getPaginationData({
	page,
	pageCountMax = 12,
}: {
	page: Page;
	pageCountMax?: number;
}): PaginationData {
	const { currentPage, lastPage: pageCount, url } = page;

	// Remove the page number (and only the page number) from the end of the current URL
	const pageBasePath = getSiteUrl(url.current.replace(new RegExp(`/${String(currentPage)}$`), ''));

	// Get the URL for a given page
	const getPageNumberLink = (pageNumber: number) =>
		pageNumber === 1 ? pageBasePath : urlJoin(pageBasePath, String(pageNumber), '/');

	// Generate a list of page numbers, with special handling for large numbers of pages
	const pageArray =
		pageCount <= pageCountMax
			? R.range(1, pageCount + 1)
			: getPageNumberArray({ currentPage, pageCount, pagesShown: pageCountMax });

	return {
		getPageNumberLink,
		pagePrevLink: url.prev ?? undefined,
		pageNextLink: url.next ?? undefined,
		pageArray,
	};
}
