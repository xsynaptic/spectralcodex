import type { Page } from 'astro';

import type { Pagination } from '#lib/utils/pagination-types.ts';

import { getTranslations } from '#lib/i18n/i18n-translations.ts';
import { getPathWithTrailingSlash } from '#lib/utils/routing.ts';
import { formatStringTemplate } from '#lib/utils/text.ts';

// Astro appends the trailing slash only under `trailingSlash: 'always'`, and dev runs `'ignore'`
export function getPagination(page: Page) {
	const { currentPage, lastPage, url } = page;

	const t = getTranslations();

	const basePath = url.first ?? url.current;

	const options = Array.from({ length: lastPage }, (_, index) => {
		const pageNumber = index + 1;

		return {
			isCurrent: pageNumber === currentPage,
			label: formatStringTemplate(t('site.pagination.pageNumber.label'), { page: pageNumber }),
			url:
				pageNumber === 1
					? getPathWithTrailingSlash(basePath)
					: getPathWithTrailingSlash(basePath, String(pageNumber)),
		};
	});

	const pagination: Pagination = {
		counter: formatStringTemplate(t('site.pagination.counter.label'), {
			current: currentPage,
			total: lastPage,
		}),
		label: t('site.pagination.label'),
		options,
		selectLabel: t('site.pagination.select.label'),
		selectSuffix: formatStringTemplate(t('site.pagination.select.total'), { total: lastPage }),
		submitLabel: t('site.pagination.select.submit'),
	};

	if (url.prev) {
		pagination.previous = {
			label: t('pagination.previous'),
			url: getPathWithTrailingSlash(url.prev),
		};
	}

	if (url.next) {
		pagination.next = { label: t('pagination.next'), url: getPathWithTrailingSlash(url.next) };
	}

	return pagination;
}
