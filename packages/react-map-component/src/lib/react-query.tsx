import type { AsyncStorage, PersistedQuery } from '@tanstack/query-persist-client-core';
import type { PropsWithChildren } from 'react';

import { experimental_createQueryPersister } from '@tanstack/query-persist-client-core';
import { QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { del, entries, get, set } from 'idb-keyval';
import { useState } from 'react';

import { mapCacheSchemaVersion, mapCacheStorageKeyPrefix } from '#constants.ts';
import { trackMapErrorOnce } from '#lib/track.ts';

const millisecondsPerDay = 1000 * 60 * 60 * 24;

interface ReactQueryProviderProps extends PropsWithChildren {
	isDev?: boolean | undefined;
}

// Without this a storage error fails the query instead of letting it fetch
async function ignoreFailure<TResult>(operation: Promise<TResult>) {
	try {
		return await operation;
	} catch {
		return;
	}
}

const mapCacheStorage = {
	entries: async () => (await ignoreFailure(entries<string, PersistedQuery>())) ?? [],
	getItem: (key: string) => ignoreFailure(get<PersistedQuery>(key)),
	removeItem: (key: string) => ignoreFailure(del(key)),
	setItem: (key: string, value: PersistedQuery) => ignoreFailure(set(key, value)),
} satisfies AsyncStorage<PersistedQuery>;

let browserQueryClient: QueryClient | undefined;

function createQueryClient(isDev: boolean | undefined) {
	const lifetime = isDev ? 0 : millisecondsPerDay;

	return new QueryClient({
		defaultOptions: { queries: { gcTime: lifetime, staleTime: lifetime } },
	});
}

function createPersistedQueryClient() {
	const persister = experimental_createQueryPersister<PersistedQuery>({
		buster: mapCacheSchemaVersion,
		deserialize: (persistedQuery) => persistedQuery,
		filters: { predicate: (query) => query.meta?.persist !== false },
		maxAge: millisecondsPerDay,
		prefix: mapCacheStorageKeyPrefix,
		refetchOnRestore: false,
		serialize: (persistedQuery) => persistedQuery,
		storage: mapCacheStorage,
	});

	// Old content hashes are never requested again, so nothing else removes them
	const scheduleIdle = 'requestIdleCallback' in globalThis ? requestIdleCallback : setTimeout;

	scheduleIdle(() => void persister.persisterGc());

	return new QueryClient({
		defaultOptions: {
			queries: {
				gcTime: millisecondsPerDay,
				// The cache is restored inside the fetch, which is paused offline by default
				networkMode: 'offlineFirst',
				persister: persister.persisterFn,
				staleTime: millisecondsPerDay,
			},
		},
		queryCache: new QueryCache({
			onError: (_error, query) => {
				trackMapErrorOnce(String(query.queryKey[0]));
			},
		}),
	});
}

function getQueryClient(isDev: boolean | undefined) {
	// On the server a shared client would keep a query for every page built
	if (isDev || typeof window === 'undefined') return createQueryClient(isDev);

	if (!browserQueryClient) browserQueryClient = createPersistedQueryClient();

	return browserQueryClient;
}

export const ReactQueryProvider = ({ children, isDev }: ReactQueryProviderProps) => {
	const [queryClient] = useState(() => getQueryClient(isDev));

	return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};
