import type { LoaderContext } from 'astro/loaders';

import { EventEmitter } from 'node:events';
import { vi } from 'vitest';

interface MockDataEntry {
	id: string;
	data: Record<string, unknown>;
	filePath?: string;
	digest?: string;
}

interface MockLoaderContextOptions {
	root: URL;
	parseData?: LoaderContext['parseData'];
}

// Astro's ContentLayer and MutableDataStore are internal; mock only the surface the loader touches
export function createMockLoaderContext({ root, parseData }: MockLoaderContextOptions) {
	const entries = new Map<string, MockDataEntry>();
	const logs: Array<{ level: 'info' | 'warn' | 'error'; message: string }> = [];

	// eslint-disable-next-line unicorn/prefer-event-target -- mimics chokidar's FSWatcher, which is an EventEmitter
	const watcher = Object.assign(new EventEmitter(), { add: vi.fn() });

	const defaultParseData = (({ data }: { data: Record<string, unknown> }) =>
		Promise.resolve(data)) as LoaderContext['parseData'];

	const context = {
		collection: 'images',
		store: {
			get: (id: string) => entries.get(id),
			set: (entry: MockDataEntry) => {
				entries.set(entry.id, entry);
				return true;
			},
			delete: (id: string) => {
				entries.delete(id);
			},
			keys: () => [...entries.keys()],
		},
		logger: {
			info: (message: string) => {
				logs.push({ level: 'info', message });
			},
			warn: (message: string) => {
				logs.push({ level: 'warn', message });
			},
			error: (message: string) => {
				logs.push({ level: 'error', message });
			},
		},
		config: { root },
		parseData: parseData ?? defaultParseData,
		// Mimics Astro's implementation: JSON.stringify silently drops function values
		generateDigest: (data: Record<string, unknown> | string) =>
			typeof data === 'string' ? data : JSON.stringify(data),
		watcher,
	} as unknown as LoaderContext;

	return { context, entries, logs, watcher };
}
