import type { PagefindSearchFragment } from '../types';

interface SearchResultProps {
	result: PagefindSearchFragment;
}

export function SearchResult({ result }: SearchResultProps) {
	const title = result.meta.title ?? result.url;

	return (
		<li className="border-b border-primary-200 last:border-b-0 dark:border-primary-600">
			<a
				href={result.url}
				className="block px-3 py-2 transition-colors hover:bg-primary-50 dark:hover:bg-primary-700"
			>
				<span className="text-sm font-medium text-accent-500 dark:text-accent-400">{title}</span>
				<span
					className="mt-1 block text-xs leading-relaxed text-primary-600 dark:text-primary-400 [&_mark]:rounded-sm [&_mark]:bg-highlight-100 [&_mark]:px-0.5 [&_mark]:text-highlight-600 dark:[&_mark]:bg-primary-600 dark:[&_mark]:text-primary-300"
					dangerouslySetInnerHTML={{ __html: result.excerpt }}
				/>
			</a>
		</li>
	);
}
