import type { PropsWithChildren } from 'react';

import { QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

import { trackMapErrorOnce } from '#track.ts';

const millisecondsPerDay = 1000 * 60 * 60 * 24;

let browserQueryClient: QueryClient | undefined;

function createQueryClient(gcTime: number) {
	return new QueryClient({
		defaultOptions: {
			queries: { gcTime, networkMode: 'offlineFirst', staleTime: Infinity },
		},
		queryCache: new QueryCache({
			onError: (_error, query) => {
				if (query.meta?.isDerived) return;

				trackMapErrorOnce(String(query.queryKey[0]));
			},
		}),
	});
}

function getQueryClient() {
	// On the server a shared client keeps a query for every page built
	// Infinity means no cleanup timer and faster builds
	if (typeof window === 'undefined') return createQueryClient(Infinity);

	if (!browserQueryClient) browserQueryClient = createQueryClient(millisecondsPerDay);

	return browserQueryClient;
}

export const ReactQueryProvider = ({ children }: PropsWithChildren) => {
	const [queryClient] = useState(getQueryClient);

	return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};
