import type { PagefindSearchFragment } from '../types';

import { SearchResult } from './search-result';

interface SearchResultsProps {
	results: Array<PagefindSearchFragment>;
	totalCount: number;
	loading: boolean;
	query: string;
	hasMore: boolean;
	onLoadMore: () => void;
}

export function SearchResults({
	results,
	totalCount,
	loading,
	query,
	hasMore,
	onLoadMore,
}: SearchResultsProps) {
	if (query.length === 0) return;

	if (loading && results.length === 0) {
		return (
			<div className="px-3 py-4 text-center text-sm text-primary-400 dark:text-primary-500">
				Searching...
			</div>
		);
	}

	if (results.length === 0) {
		return (
			<div className="px-3 py-4 text-center text-sm text-primary-400 dark:text-primary-500">
				No results for &ldquo;{query}&rdquo;
			</div>
		);
	}

	return (
		<div>
			<div className="px-3 py-1.5 text-xs text-primary-400 dark:text-primary-500">
				{totalCount} {totalCount === 1 ? 'result' : 'results'}
			</div>
			<ul>
				{results.map((result) => (
					<SearchResult key={result.url} result={result} />
				))}
			</ul>
			{hasMore ? (
				<div className="px-3 py-2">
					<button
						type="button"
						onClick={onLoadMore}
						disabled={loading}
						className="w-full rounded-sm bg-primary-200 py-1.5 text-xs text-primary-600 transition-colors hover:bg-primary-300 disabled:opacity-50 dark:bg-primary-700 dark:text-primary-400 dark:hover:bg-primary-600"
					>
						{loading ? 'Loading...' : 'Show more results'}
					</button>
				</div>
			) : undefined}
		</div>
	);
}
