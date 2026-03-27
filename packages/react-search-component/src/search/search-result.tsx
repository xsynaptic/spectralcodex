import { useState } from 'react';

import type { PagefindSearchFragment, PagefindSubResult } from '../types';

const INITIAL_SUB_RESULTS = 3;

function SearchExcerpt({ html }: { html: string }) {
	return (
		<span
			className="mt-1 block text-xs leading-relaxed text-primary-600 dark:text-primary-400 [&_mark]:rounded-sm [&_mark]:bg-highlight-100 [&_mark]:px-0.5 [&_mark]:text-highlight-600 dark:[&_mark]:bg-primary-600 dark:[&_mark]:text-primary-300"
			dangerouslySetInnerHTML={{ __html: html }}
		/>
	);
}

function SubResult({ subResult }: { subResult: PagefindSubResult }) {
	return (
		<li>
			<a
				href={subResult.url}
				className="block py-1 transition-colors hover:text-accent-400 dark:hover:text-accent-300"
			>
				<span className="text-xs font-medium text-accent-500/80 dark:text-accent-400/80">
					{subResult.title}
				</span>
				<SearchExcerpt html={subResult.excerpt} />
			</a>
		</li>
	);
}

export function SearchResult({ result }: { result: PagefindSearchFragment }) {
	const title = result.meta.title ?? result.url;

	// Filter out the sub-result that duplicates the main result
	const subResults = result.sub_results.filter(
		(subResult) => subResult.url !== result.url,
	);

	const hasSubResults = subResults.length > 0;
	const hasOverflow = subResults.length > INITIAL_SUB_RESULTS;
	const [isExpanded, setIsExpanded] = useState(false);
	const visibleSubResults = isExpanded ? subResults : subResults.slice(0, INITIAL_SUB_RESULTS);

	return (
		<li className="border-b border-primary-200 last:border-b-0 dark:border-primary-600">
			<a
				href={result.url}
				className="block px-3 py-2 transition-colors hover:bg-primary-50 dark:hover:bg-primary-700"
			>
				<span className="text-sm font-medium text-accent-500 dark:text-accent-400">
					{title}
				</span>
				<SearchExcerpt html={result.excerpt} />
			</a>
			{hasSubResults ? (
				<div className="border-t border-primary-100 px-3 py-1 pl-6 dark:border-primary-700">
					<ul className="space-y-0.5">
						{visibleSubResults.map((subResult) => (
							<SubResult key={subResult.url} subResult={subResult} />
						))}
					</ul>
					{hasOverflow ? (
						<button
							type="button"
							onClick={() => {
								setIsExpanded((previous) => !previous);
							}}
							className="mt-1 mb-1 text-xs text-primary-400 transition-colors hover:text-accent-400 dark:text-primary-500 dark:hover:text-accent-300"
						>
							{isExpanded
								? 'Show fewer'
								: `+${String(subResults.length - INITIAL_SUB_RESULTS)} more sections`}
						</button>
					) : undefined}
				</div>
			) : undefined}
		</li>
	);
}
