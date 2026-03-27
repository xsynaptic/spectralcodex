import { useCallback, useEffect, useRef, useState } from 'react';

import type {
	PagefindFilterCounts,
	PagefindInstance,
	PagefindSearchFragment,
	PagefindSearchResult,
	SearchRankingOptions,
} from '../types';

const DEBOUNCE_TIMEOUT = 300;

let didInit = false;

interface UsePagefindOptions {
	bundlePath: string;
	pageSize: number;
	ranking?: SearchRankingOptions | undefined;
}

export function usePagefind({ bundlePath, pageSize, ranking }: UsePagefindOptions) {
	const pagefindRef = useRef<PagefindInstance | undefined>(undefined);
	const pendingResultsRef = useRef<Array<PagefindSearchResult>>([]);
	const baselineFiltersRef = useRef<PagefindFilterCounts>({});

	const rankingRef = useRef(ranking);
	rankingRef.current = ranking;

	const [query, setQuery] = useState('');
	const [results, setResults] = useState<Array<PagefindSearchFragment>>([]);
	const [totalCount, setTotalCount] = useState(0);
	const [loading, setLoading] = useState(false);
	const visibleCountRef = useRef(pageSize);
	const [availableFilters, setAvailableFilters] = useState<PagefindFilterCounts>({});
	const [activeFilters, setActiveFilters] = useState<Record<string, Array<string>>>({});

	useEffect(() => {
		if (didInit) return;
		didInit = true;

		let destroyed = false;

		async function init() {
			const pagefind = (await import(
				/* @vite-ignore */ `${bundlePath}pagefind.js`
			)) as PagefindInstance;

			if (destroyed) return;

			await pagefind.options({ bundlePath });
			pagefindRef.current = pagefind;

			const filters = await pagefind.filters();

			if (!destroyed) { // eslint-disable-line @typescript-eslint/no-unnecessary-condition
				baselineFiltersRef.current = filters;
				setAvailableFilters(filters);
			}
		}

		void init();

		return () => {
			destroyed = true;

			if (pagefindRef.current) {
				void pagefindRef.current.destroy();
				pagefindRef.current = undefined;
				didInit = false;
			}
		};
	}, [bundlePath]);

	useEffect(() => {
		if (pagefindRef.current === undefined || query.length === 0) {
			setResults([]);
			setTotalCount(0);
			pendingResultsRef.current = [];
			setAvailableFilters(baselineFiltersRef.current);
			return;
		}

		const abortController = new AbortController();

		async function performSearch() {
			const pagefind = pagefindRef.current;

			if (!pagefind) return;

			setLoading(true);

			const currentRanking = rankingRef.current;
			const searchOptions: Record<string, unknown> = {};

			if (currentRanking) {
				searchOptions.ranking = currentRanking;
			}

			if (Object.keys(activeFilters).length > 0) {
				searchOptions.filters = activeFilters;
			}

			const response = await pagefind.debouncedSearch(query, searchOptions, DEBOUNCE_TIMEOUT);

			if (abortController.signal.aborted || !response) return;

			pendingResultsRef.current = response.results;
			setTotalCount(response.results.length);
			visibleCountRef.current = pageSize;
			setAvailableFilters(response.totalFilters);

			const fragments = await Promise.all(
				response.results.slice(0, pageSize).map((result) => result.data()),
			);

			// Signal may be aborted after awaiting data() calls above
			if (abortController.signal.aborted) return; // eslint-disable-line @typescript-eslint/no-unnecessary-condition

			setResults(fragments);
			setLoading(false);
		}

		void performSearch();

		return () => {
			abortController.abort();
		};
	}, [query, pageSize, activeFilters]);

	const search = useCallback((newQuery: string) => {
		setQuery(newQuery);
	}, []);

	const clearFilters = useCallback(() => {
		setActiveFilters({});
		setAvailableFilters(baselineFiltersRef.current);
	}, []);

	const loadMore = useCallback(() => {
		const pending = pendingResultsRef.current;
		const currentVisible = visibleCountRef.current;

		if (currentVisible >= pending.length) return;

		const nextVisible = currentVisible + pageSize;
		visibleCountRef.current = nextVisible;

		void Promise.all(
			pending.slice(currentVisible, nextVisible).map((result) => result.data()),
		).then((newFragments) => {
			setResults((previous) => [...previous, ...newFragments]);
		});
	}, [pageSize]);

	const toggleFilter = useCallback((filterName: string, filterValue: string) => {
		setActiveFilters((current) => {
			const existing = current[filterName] ?? [];
			const isActive = existing.includes(filterValue);

			const updated = isActive
				? existing.filter((value) => value !== filterValue)
				: [...existing, filterValue];

			if (updated.length === 0) {
				const { [filterName]: _, ...rest } = current;
				return rest;
			}

			return { ...current, [filterName]: updated };
		});
	}, []);

	const hasMore = results.length < totalCount;

	return {
		search,
		loadMore,
		toggleFilter,
		clearFilters,
		results,
		totalCount,
		loading,
		query,
		hasMore,
		availableFilters,
		activeFilters,
	};
}
