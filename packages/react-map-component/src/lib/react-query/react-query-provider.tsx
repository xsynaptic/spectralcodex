import type { PropsWithChildren } from 'react';

import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { persistQueryClient, removeOldestQuery } from '@tanstack/react-query-persist-client';
import { useState } from 'react';

const TIME_24_HOURS = 1000 * 60 * 60 * 24;

export const ReactQueryProvider = ({ children }: PropsWithChildren) => {
	const [queryClient] = useState(() => {
		const client = new QueryClient({
			defaultOptions: {
				queries: {
					staleTime: TIME_24_HOURS,
					gcTime: TIME_24_HOURS,
				},
			},
		});

		void persistQueryClient({
			queryClient: client,
			persister: createSyncStoragePersister({
				key: 'scx-map-data-cache',
				storage: globalThis.localStorage,
				retry: removeOldestQuery,
			}),
			maxAge: TIME_24_HOURS,
		});

		return client;
	});

	return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};
