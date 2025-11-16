import type { PersistedClient, Persister } from '@tanstack/react-query-persist-client';
import type { PropsWithChildren } from 'react';

import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { del, get, set } from 'idb-keyval';
import { useState } from 'react';

const TIME_24_HOURS = 1000 * 60 * 60 * 24;

/**
 * Creates an Indexed DB persister
 * @see https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API
 */
function createIdbPersister(idbValidKey: IDBValidKey = 'reactQuery') {
	return {
		persistClient: async (client: PersistedClient) => {
			await set(idbValidKey, client);
		},
		restoreClient: async () => {
			return await get<PersistedClient>(idbValidKey);
		},
		removeClient: async () => {
			await del(idbValidKey);
		},
	} satisfies Persister;
}

export const ReactQueryProvider = ({ children }: PropsWithChildren) => {
	const [queryClient] = useState(() => {
		return new QueryClient({
			defaultOptions: {
				queries: {
					staleTime: TIME_24_HOURS,
					gcTime: TIME_24_HOURS,
				},
			},
		});
	});

	return (
		<PersistQueryClientProvider
			client={queryClient}
			persistOptions={{
				persister: createIdbPersister('spectralcodex-map-data-cache'),
				maxAge: TIME_24_HOURS,
			}}
		>
			{children}
		</PersistQueryClientProvider>
	);
};
