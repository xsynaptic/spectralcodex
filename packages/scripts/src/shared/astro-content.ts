/**
 * Access to `astro:content` from outside the Astro runtime
 * Requires `astro sync` or a build to have written the content store
 */
import type * as AstroContentModule from 'astro:content';
import type { CollectionKey } from 'astro:content';

import { getViteConfig } from 'astro/config';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { createLogger, createServer, createServerModuleRunner } from 'vite';

type AstroContent = typeof AstroContentModule;

// Mirrors Astro's own `configPaths`; it does not accept the CommonJS variants
const configFilenames = [
	'astro.config.mjs',
	'astro.config.js',
	'astro.config.ts',
	'astro.config.mts',
];

// The Astro project root, which need not be the workspace root
export function findAstroRoot(startDir = process.cwd()) {
	let current = path.resolve(startDir);

	while (current !== path.dirname(current)) {
		const hasConfig = configFilenames.some((filename) => existsSync(path.join(current, filename)));

		if (hasConfig) return current;

		current = path.dirname(current);
	}

	throw new Error(`Could not locate an Astro config above ${startDir}`);
}

// The subset of an entry that consumers read; every `CollectionEntry` satisfies it
export interface ContentEntry {
	id: string;
	collection: string;
	data: Record<string, unknown>;
	body?: string | undefined;
	filePath?: string | undefined;
	// Astro widens this to `string | number`; file-based collections only ever write a string
	digest?: string | number | undefined;
}

export async function withAstroContent<T>(callback: (content: AstroContent) => Promise<T>) {
	// An unrooted config resolves against `process.cwd()`, finds none, and reads every collection back empty
	const root = findAstroRoot();

	const configFn = getViteConfig({}, { root, logLevel: 'silent' });
	const config =
		typeof configFn === 'function'
			? await configFn({ command: 'serve', mode: 'development' })
			: configFn;

	const server = await createServer({
		...config,
		logLevel: 'silent',
		// Astro's config sets a `customLogger` that writes to stdout and ignores `logLevel`
		customLogger: createLogger('silent'),
		server: { middlewareMode: true, hmr: false, ws: false },
	});

	try {
		const runner = createServerModuleRunner(server.environments.ssr);

		return await callback(await runner.import<AstroContent>('astro:content'));
	} finally {
		// The process hangs on the open server otherwise
		await server.close();
	}
}

export async function getCollectionEntries<C extends CollectionKey>(
	{ getCollection }: AstroContent,
	collections: Array<C>,
) {
	const entries = await Promise.all(collections.map((collection) => getCollection(collection)));

	return entries.flat();
}
