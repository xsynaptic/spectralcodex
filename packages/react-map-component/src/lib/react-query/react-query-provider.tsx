import type { PropsWithChildren } from 'react';

import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { useState } from 'react';

import { createIdbPersister } from './react-query-idb-persister';

const TIME_24_HOURS = 1000 * 60 * 60 * 24;

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
				persister: createIdbPersister('scx-map-data-cache'),
				maxAge: TIME_24_HOURS,
			}}
		>
			{children}
		</PersistQueryClientProvider>
	);
};
