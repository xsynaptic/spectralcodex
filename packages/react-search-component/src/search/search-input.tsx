interface SearchInputProps {
	query: string;
	onQueryChange: (query: string) => void;
	autoFocus?: boolean;
}

export function SearchInput({ query, onQueryChange, autoFocus }: SearchInputProps) {
	return (
		<div className="relative">
			<input
				type="text"
				autoFocus={autoFocus}
				value={query}
				onChange={(event) => {
					onQueryChange(event.target.value);
				}}
				placeholder="Search..."
				className="w-full rounded-sm border border-primary-200 bg-primary-50 px-3 py-2 text-sm text-primary-700 transition-colors outline-none placeholder:text-primary-400 focus:border-accent-300 dark:border-primary-600 dark:bg-primary-800 dark:text-primary-300 dark:placeholder:text-primary-500 dark:focus:border-accent-500"
			/>
			{query.length > 0 ? (
				<button
					type="button"
					onClick={() => {
						onQueryChange('');
					}}
					className="absolute top-1/2 right-2 -translate-y-1/2 text-primary-400 transition-colors hover:text-accent-300 dark:text-primary-500 dark:hover:text-accent-500"
					aria-label="Clear search"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						className="size-4"
					>
						<circle cx="12" cy="12" r="10" />
						<path d="m15 9l-6 6m0-6l6 6" />
					</svg>
				</button>
			) : undefined}
		</div>
	);
}
