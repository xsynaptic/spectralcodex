import { useCallback, useEffect, useRef, useState } from 'react';

import type {
	PagefindInstance,
	PagefindSearchFragment,
	PagefindSearchResult,
	SearchRankingOptions,
} from '../types';

const DEBOUNCE_TIMEOUT = 300;

// Module-level guard: pagefind is a singleton, only init once per app load (rule 8.1)
let didInit = false;

interface UsePagefindOptions {
	bundlePath: string;
	pageSize: number;
	ranking?: SearchRankingOptions | undefined;
}

export function usePagefind({ bundlePath, pageSize, ranking }: UsePagefindOptions): {
	search: (query: string) => void;
	loadMore: () => void;
	results: Array<PagefindSearchFragment>;
	totalCount: number;
	loading: boolean;
	query: string;
} {
	const pagefindRef = useRef<PagefindInstance | undefined>(undefined);
	const pendingResultsRef = useRef<Array<PagefindSearchResult>>([]);

	// Store ranking in a ref to avoid triggering search effect on object reference changes (rule 5.6)
	const rankingRef = useRef(ranking);
	rankingRef.current = ranking;

	const [query, setQuery] = useState('');
	const [results, setResults] = useState<Array<PagefindSearchFragment>>([]);
	const [totalCount, setTotalCount] = useState(0);
	const [loading, setLoading] = useState(false);
	const [, setVisibleCount] = useState(pageSize);

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
			return;
		}

		const abortController = new AbortController();

		async function performSearch() {
			const pagefind = pagefindRef.current;

			if (!pagefind) return;

			setLoading(true);

			const currentRanking = rankingRef.current;
			const searchOptions = currentRanking ? { ranking: currentRanking } : {};
			const response = await pagefind.debouncedSearch(query, searchOptions, DEBOUNCE_TIMEOUT);

			if (abortController.signal.aborted || !response) return;

			pendingResultsRef.current = response.results;
			setTotalCount(response.unfilteredResultCount);
			setVisibleCount(pageSize);

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
	}, [query, pageSize]);

	const search = useCallback((newQuery: string) => {
		setQuery(newQuery);
	}, []);

	// Functional setState for both visibleCount and results to avoid stale closures (rule 5.9)
	const loadMore = useCallback(() => {
		setVisibleCount((currentVisible) => {
			const pending = pendingResultsRef.current;

			if (currentVisible >= pending.length) return currentVisible;

			const nextVisible = currentVisible + pageSize;

			void Promise.all(
				pending.slice(currentVisible, nextVisible).map((result) => result.data()),
			).then((newFragments) => {
				setResults((previous) => [...previous, ...newFragments]);
			});

			return nextVisible;
		});
	}, [pageSize]);

	return { search, loadMore, results, totalCount, loading, query };
}
