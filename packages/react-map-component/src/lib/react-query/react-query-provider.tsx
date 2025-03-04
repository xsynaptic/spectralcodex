import type { ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export const ReactQueryProvider = ({ children }: { children: ReactNode }) => {
	const queryClient = new QueryClient();

	return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};
