import type { UseQueryResult } from '@tanstack/react-query';
import type { FC, ReactNode } from 'react';
import type { z } from 'zod';

import { useQuery } from '@tanstack/react-query';
import { createContext, useContext } from 'react';

import { FETCH_TIMEOUT_MS } from '../constants';

interface MapDataQueryConfig<TSchema extends z.ZodType> {
	name: string;
	schema: TSchema;
	// Optional sources stay disabled until a URL or inline data is provided
	optional?: boolean;
}

interface MapDataProviderProps<TInput> {
	apiUrl: string | undefined;
	data: Array<TInput> | undefined;
	// Per-map content hash that cache-keys the inline dataset
	dataKey: string | undefined;
	version: string | undefined;
	isDev: boolean | undefined;
	children: ReactNode;
}

export function createMapDataQuery<TSchema extends z.ZodType>({
	name,
	schema,
	optional = false,
}: MapDataQueryConfig<TSchema>) {
	type TParsed = z.output<TSchema>;
	type TInput = z.input<TSchema>;

	function parse(raw: unknown) {
		const result = schema.array().safeParse(raw);

		if (!result.success) {
			console.error(`[Map] ${name} parse error:`, result.error);
			throw new Error(`[Map] Failed to parse ${name}`);
		}

		return result.data as Array<TParsed>;
	}

	const DataContext = createContext<UseQueryResult<Array<TParsed> | undefined> | undefined>(
		undefined,
	);

	const useDataQuery = () => {
		const context = useContext(DataContext);

		if (!context) {
			throw new Error(`[Map] ${name} query used outside its provider`);
		}

		return context;
	};

	const DataProvider: FC<MapDataProviderProps<TInput>> = function DataProvider({
		apiUrl,
		data,
		dataKey,
		version,
		isDev,
		children,
	}) {
		// Inline data without a key would collide across maps sharing this query name
		if (data && dataKey === undefined && isDev) {
			throw new Error(`[Map] ${name} inline data requires a dataKey`);
		}

		// eslint-disable-next-line @tanstack/query/exhaustive-deps -- parse/schema are stable per factory instance; the queryKey inputs fully determine the result
		const query = useQuery<Array<TParsed> | undefined>({
			queryKey: [name, apiUrl, dataKey ?? (data ? 'inline' : false), version, isDev],
			// Inline data ships in the page HTML; persisting it to IndexedDB is pure overhead
			meta: { persist: !data },
			queryFn: async () => {
				if (data) return parse(data);

				if (apiUrl) {
					const response = await fetch(
						apiUrl,
						isDev ? {} : { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) },
					);

					if (!response.ok) throw new Error(`[Map] Fetch failed: ${String(response.status)}`);

					const raw: unknown = await response.json();

					return parse(raw);
				}

				throw new Error(`[Map] Either ${name} or its API URL must be provided`);
			},
			refetchOnWindowFocus: false,
			refetchOnMount: false,
			...(optional ? { enabled: !!apiUrl || !!data } : {}),
		});

		return <DataContext.Provider value={query}>{children}</DataContext.Provider>;
	};

	return { DataProvider, useDataQuery };
}
