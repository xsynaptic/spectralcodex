import { useCallback, useState } from 'react';

import type { SearchComponentProps } from '../types';

import { usePagefind } from '../lib/pagefind';
import { SearchOverlay } from './search-overlay';

const DEFAULT_PAGE_SIZE = 5;

export function SearchContainer({ bundlePath, pageSize, ranking }: SearchComponentProps) {
	const [isOpen, setIsOpen] = useState(false);
	const { search, results, totalCount, loading, query } = usePagefind({
		bundlePath,
		pageSize: pageSize ?? DEFAULT_PAGE_SIZE,
		ranking,
	});

	const handleClose = useCallback(() => {
		setIsOpen(false);
		search('');
	}, [search]);

	const handleOpen = useCallback(() => {
		setIsOpen(true);
	}, []);

	return (
		<>
			<button
				type="button"
				onClick={handleOpen}
				className="flex cursor-pointer items-center justify-center rounded-full text-primary-700 opacity-60 transition-opacity hover:opacity-100 dark:text-primary-300"
				aria-label="Open search"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="24"
					height="24"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="2"
					aria-hidden="true"
				>
					<path d="m21 21l-4.34-4.34" />
					<circle cx="11" cy="11" r="8" />
				</svg>
			</button>
			{isOpen ? (
				<SearchOverlay
					query={query}
					onQueryChange={search}
					results={results}
					totalCount={totalCount}
					loading={loading}
					onClose={handleClose}
				/>
			) : undefined}
		</>
	);
}
