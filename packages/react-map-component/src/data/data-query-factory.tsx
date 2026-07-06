import type { FC, ReactNode } from 'react';
import type { z } from 'zod';

import { useQuery } from '@tanstack/react-query';
import { createContext, useContext, useMemo } from 'react';

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

	// Consumers run useQuery themselves so property tracking stays per consumer
	interface DataQueryConfigValue {
		apiUrl: string | undefined;
		data: Array<TInput> | undefined;
		dataKey: string | undefined;
		version: string | undefined;
		isDev: boolean | undefined;
	}

	function parse(raw: unknown) {
		const result = schema.array().safeParse(raw);

		if (!result.success) {
			console.error(`[Map] ${name} parse error:`, result.error);
			throw new Error(`[Map] Failed to parse ${name}`);
		}

		return result.data as Array<TParsed>;
	}

	const DataContext = createContext<DataQueryConfigValue | undefined>(undefined);

	const useDataQuery = () => {
		const config = useContext(DataContext);

		if (!config) {
			throw new Error(`[Map] ${name} query used outside its provider`);
		}

		const { apiUrl, data, dataKey, version, isDev } = config;

		// eslint-disable-next-line @tanstack/query/exhaustive-deps -- queryKey inputs fully determine the result
		return useQuery<Array<TParsed> | undefined>({
			queryKey: [name, apiUrl, dataKey ?? (data ? 'inline' : false), version, isDev],
			// Inline data ships in the HTML; skip IndexedDB persistence
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
	};

	const DataProvider: FC<MapDataProviderProps<TInput>> = function DataProvider({
		apiUrl,
		data,
		dataKey,
		version,
		isDev,
		children,
	}) {
		// Keyless inline data would collide across maps sharing this query name
		if (data && dataKey === undefined && isDev) {
			throw new Error(`[Map] ${name} inline data requires a dataKey`);
		}

		const config = useMemo(
			() => ({ apiUrl, data, dataKey, version, isDev }),
			[apiUrl, data, dataKey, version, isDev],
		);

		return <DataContext.Provider value={config}>{children}</DataContext.Provider>;
	};

	return { DataProvider, useDataQuery };
}
