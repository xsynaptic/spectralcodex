import type { MapFeaturesRule } from '@spectralcodex/map-codec';
import type { z } from 'zod';

import {
	getMapRowById,
	MapDivisionMaskSchema,
	MapPopupItemSchema,
	MapScopeRowSchema,
	MapSourceItemSchema,
	selectMapRows,
} from '@spectralcodex/map-codec';
import { queryOptions, skipToken, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { fetchTimeoutMs, mapScopesFileName } from '#constants.ts';
import { useMapConfig } from '#lib/config.tsx';
import { useMapStore } from '#store/store.tsx';

async function fetchMapJson<Schema extends z.ZodType>(
	url: string,
	schema: Schema,
): Promise<z.output<Schema>> {
	const response = await fetch(url, { signal: AbortSignal.timeout(fetchTimeoutMs) });

	if (!response.ok) throw new Error(`[Map] Fetch failed: ${String(response.status)} ${url}`);

	return schema.parse(await response.json());
}

export function getPayloadUrl(directoryUrl: string, name: string) {
	const [path = '', search = ''] = directoryUrl.split('?', 2);

	return `${path.slice(0, path.lastIndexOf('/') + 1)}${name}.json?${search}`;
}

function directoryQueryOptions(url: string) {
	return queryOptions({
		queryFn: () => fetchMapJson(url, MapSourceItemSchema.array()),
		queryKey: ['map-directory', url],
	});
}

function mapRowsQueryOptions(url: string, rule: MapFeaturesRule) {
	return queryOptions({
		meta: { isDerived: true },
		queryFn: async ({ client }) =>
			selectMapRows(
				await client.query({ ...directoryQueryOptions(url), staleTime: 'static' }),
				rule,
			),
		queryKey: ['source-data', url, rule],
	});
}

function chunkQueryOptions(url: string | undefined) {
	return queryOptions({
		queryFn: url ? () => fetchMapJson(url, MapPopupItemSchema.array()) : skipToken,
		queryKey: ['popup-chunk', url],
		// A Chunk from an earlier deploy returns 404, so retry once and then fall back to a title-only popup
		retry: 1,
	});
}

function scopeListQueryOptions(url: string, isEnabled: boolean) {
	return queryOptions({
		enabled: isEnabled,
		queryFn: () => fetchMapJson(url, MapScopeRowSchema.array()),
		queryKey: ['scope-list', url],
		// An earlier deploy's list returns 404, and search shows nothing until this settles
		retry: 1,
		staleTime: 'static',
	});
}

function divisionQueryOptions(url: string | undefined) {
	return queryOptions({
		queryFn: url ? () => fetchMapJson(url, MapDivisionMaskSchema) : skipToken,
		queryKey: ['division-mask', url],
	});
}

export function useMapRows() {
	const { apiSourceUrl, mapFeaturesRule } = useMapConfig();

	return useQuery(mapRowsQueryOptions(apiSourceUrl, mapFeaturesRule));
}

export function useIsMapLoading() {
	const { isLoading: isRowsLoading } = useMapRows();
	const isCanvasLoading = useMapStore((state) => state.isCanvasLoading);

	return isRowsLoading || isCanvasLoading;
}

export function useEnsureMapRows() {
	const client = useQueryClient();
	const { apiSourceUrl, mapFeaturesRule } = useMapConfig();

	return useCallback(
		() =>
			client.query({
				...mapRowsQueryOptions(apiSourceUrl, mapFeaturesRule),
				staleTime: 'static',
			}),
		[apiSourceUrl, client, mapFeaturesRule],
	);
}

export function useMapRow(id: string | undefined) {
	const { data: rows } = useMapRows();

	return id && rows ? getMapRowById(rows, id) : undefined;
}

export function useMapChunk(chunkKey: string | undefined) {
	const { apiSourceUrl } = useMapConfig();

	return useQuery(chunkQueryOptions(chunkKey ? getPayloadUrl(apiSourceUrl, chunkKey) : undefined));
}

export function useMapDivision(url: string | undefined) {
	return useQuery(divisionQueryOptions(url));
}

export function useMapScopeList(isEnabled: boolean) {
	const { apiSourceUrl } = useMapConfig();

	return useQuery(scopeListQueryOptions(getPayloadUrl(apiSourceUrl, mapScopesFileName), isEnabled));
}
