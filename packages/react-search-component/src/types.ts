// Subset of pagefind's search API types
// Tracking: https://github.com/CloudCannon/pagefind/issues/767
export interface PagefindInstance {
	init: () => Promise<void>;
	options: (options: { bundlePath: string }) => Promise<void>;
	search: (
		query: string,
		options?: Record<string, unknown>,
	) => Promise<PagefindSearchResults>;
	debouncedSearch: (
		query: string,
		options?: Record<string, unknown>,
		timeout?: number,
	) => Promise<PagefindSearchResults | null>;
	filters: () => Promise<PagefindFilterCounts>;
	destroy: () => Promise<void>;
}

export type PagefindFilterCounts = Record<string, Record<string, number>>;

export interface PagefindSearchResults {
	results: Array<PagefindSearchResult>;
	unfilteredResultCount: number;
	filters: PagefindFilterCounts;
	totalFilters: PagefindFilterCounts;
}

export interface PagefindSearchResult {
	id: string;
	score: number;
	data: () => Promise<PagefindSearchFragment>;
}

export interface PagefindSearchFragment {
	url: string;
	excerpt: string;
	meta: Record<string, string>;
	sub_results: Array<PagefindSubResult>;
}

export interface PagefindSubResult {
	title: string;
	url: string;
	excerpt: string;
}

export interface SearchRankingOptions {
	pageLength?: number | undefined;
	termFrequency?: number | undefined;
}

export interface SearchComponentProps {
	bundlePath: string;
	pageSize?: number | undefined;
	ranking?: SearchRankingOptions | undefined;
}
