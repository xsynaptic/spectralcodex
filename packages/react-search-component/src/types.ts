// Subset of pagefind's search API types
// Tracking: https://github.com/CloudCannon/pagefind/issues/767
export interface PagefindInstance {
	init: () => Promise<void>;
	options: (options: { bundlePath: string }) => Promise<void>;
	debouncedSearch: (
		query: string,
		options?: Record<string, unknown>,
		timeout?: number,
	) => Promise<PagefindSearchResults | null>;
	destroy: () => Promise<void>;
}

export interface PagefindSearchResults {
	results: Array<PagefindSearchResult>;
	unfilteredResultCount: number;
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

// Component props
export interface SearchRankingOptions {
	pageLength?: number | undefined;
	termFrequency?: number | undefined;
}

export interface SearchComponentProps {
	bundlePath: string;
	pageSize?: number | undefined;
	ranking?: SearchRankingOptions | undefined;
}
