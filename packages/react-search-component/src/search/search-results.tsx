import type { PagefindSearchFragment } from '../types';

import { SearchResult } from './search-result';

interface SearchResultsProps {
	results: Array<PagefindSearchFragment>;
	totalCount: number;
	loading: boolean;
	query: string;
}

export function SearchResults({ results, totalCount, loading, query }: SearchResultsProps) {
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
				No results for "{query}"
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
		</div>
	);
}
