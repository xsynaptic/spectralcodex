import { useEffect, useRef } from 'react';

import type { PagefindSearchFragment } from '../types';

import { SearchInput } from './search-input';
import { SearchResults } from './search-results';

interface SearchOverlayProps {
	query: string;
	onQueryChange: (query: string) => void;
	results: Array<PagefindSearchFragment>;
	totalCount: number;
	loading: boolean;
	onClose: () => void;
}

export function SearchOverlay({
	query,
	onQueryChange,
	results,
	totalCount,
	loading,
	onClose,
}: SearchOverlayProps) {
	const overlayRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		document.body.style.overflow = 'hidden';

		function handleKeyDown(event: KeyboardEvent) {
			if (event.key === 'Escape') {
				onClose();
			}
		}

		document.addEventListener('keydown', handleKeyDown);

		return () => {
			document.body.style.overflow = '';
			document.removeEventListener('keydown', handleKeyDown);
		};
	}, [onClose]);

	function handleBackdropClick(event: React.MouseEvent) {
		if (event.target === overlayRef.current) {
			onClose();
		}
	}

	return (
		<div
			ref={overlayRef}
			onClick={handleBackdropClick}
			className="fixed inset-0 z-50 flex items-start justify-center bg-primary-900/60 pt-[10vh] backdrop-blur-sm dark:bg-primary-950/70"
			role="dialog"
			aria-modal="true"
			aria-label="Search"
		>
			<div className="w-full max-w-xl">
				<div className="mb-2 flex justify-end">
					<button
						type="button"
						onClick={onClose}
						className="rounded-full p-1 text-primary-300 transition-colors hover:text-white dark:text-primary-500 dark:hover:text-primary-200"
						aria-label="Close search"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="20"
							height="20"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth="2"
							aria-hidden="true"
						>
							<path d="M18 6 6 18M6 6l12 12" />
						</svg>
					</button>
				</div>
				<div className="rounded-sm bg-primary-100 shadow-lg dark:bg-primary-800">
					<div className="p-3">
						<SearchInput query={query} onQueryChange={onQueryChange} autoFocus />
					</div>
					<div className="max-h-[60vh] overflow-y-auto">
						<SearchResults
							results={results}
							totalCount={totalCount}
							loading={loading}
							query={query}
						/>
					</div>
				</div>
			</div>
		</div>
	);
}
