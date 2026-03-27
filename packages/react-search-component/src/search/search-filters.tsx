import { useState } from 'react';

import type { PagefindFilterCounts } from '../types';

interface SearchFiltersProps {
	availableFilters: PagefindFilterCounts;
	activeFilters: Record<string, Array<string>>;
	onToggleFilter: (filterName: string, filterValue: string) => void;
}

function FilterGroup({
	filterName,
	values,
	activeValues,
	onToggle,
}: {
	filterName: string;
	values: Record<string, number>;
	activeValues: Array<string>;
	onToggle: (filterName: string, filterValue: string) => void;
}) {
	const [isExpanded, setIsExpanded] = useState(false);
	const activeCount = activeValues.length;

	const visibleEntries = Object.entries(values).filter(
		([value, count]) => count > 0 || activeValues.includes(value),
	);

	if (visibleEntries.length === 0) return;

	return (
		<div>
			<button
				type="button"
				onClick={() => {
					setIsExpanded((previous) => !previous);
				}}
				className="flex w-full items-center justify-between px-3 py-1.5 text-xs text-primary-500 transition-colors hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
			>
				<span className="capitalize">
					{filterName}
					{activeCount > 0 ? (
						<span className="ml-1 rounded-sm bg-accent-500 px-1.5 py-0.5 text-white">
							{activeCount}
						</span>
					) : undefined}
				</span>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="14"
					height="14"
					viewBox="0 0 24 24"
					aria-hidden="true"
					className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`}
				>
					<path fill="currentColor" d="M8.59 16.58L13.17 12L8.59 7.41L10 6l6 6l-6 6z" />
				</svg>
			</button>
			{isExpanded ? (
				<div
					className="mx-3 mb-2 flex max-h-32 flex-wrap gap-1 overflow-y-auto"
					style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--color-primary-400) transparent' }}
				>
					{visibleEntries
						.toSorted(([, countA], [, countB]) => countB - countA)
						.map(([value, count]) => {
							const isActive = activeValues.includes(value);

							return (
								<button
									key={value}
									type="button"
									onClick={() => {
										onToggle(filterName, value);
									}}
									className={`rounded-sm px-2 py-0.5 text-xs transition-colors ${
										isActive
											? 'bg-accent-500 text-white dark:bg-accent-600'
											: 'bg-primary-200 text-primary-600 hover:bg-primary-300 dark:bg-primary-700 dark:text-primary-400 dark:hover:bg-primary-600'
									}`}
								>
									{value} ({count})
								</button>
							);
						})}
				</div>
			) : undefined}
		</div>
	);
}

export function SearchFilters({
	availableFilters,
	activeFilters,
	onToggleFilter,
}: SearchFiltersProps) {
	const filterEntries = Object.entries(availableFilters).filter(
		([, values]) => Object.keys(values).length > 0,
	);

	if (filterEntries.length === 0) return;

	return (
		<div>
			{filterEntries.map(([filterName, values]) => (
				<FilterGroup
					key={filterName}
					filterName={filterName}
					values={values}
					activeValues={activeFilters[filterName] ?? []}
					onToggle={onToggleFilter}
				/>
			))}
		</div>
	);
}
