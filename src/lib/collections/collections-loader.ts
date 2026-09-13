import { glob } from 'astro/loaders';
import { CONTENT_DATA_PATH } from 'astro:env/server';

interface EntryGlobLoaderOptions {
	flatIds?: boolean;
}

const entryPattern = '**/[^_]*.(md|mdx)';

// Flat IDs let entries sit in subdirectories without the folder leaking into the ID
export function createEntryGlobLoader(collection: string, options: EntryGlobLoaderOptions = {}) {
	const base = `./${CONTENT_DATA_PATH}/${collection}`;

	if (!options.flatIds) return glob({ pattern: entryPattern, base });

	return glob({
		pattern: entryPattern,
		base,
		generateId: ({ entry }) => entry.replace(/^.*\//, '').replace(/\.(md|mdx)$/, ''),
	});
}
