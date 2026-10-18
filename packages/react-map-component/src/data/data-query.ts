import type {
	MapDirectoryColumns,
	MapDivisionMask,
	MapFeaturesRule,
	MapPayloadBase,
	MapPopupItemCompressed,
	MapScopeRow,
} from '@spectralcodex/map-codec';

import {
	decodeMapDirectory,
	decodeMapPopupData,
	getMapPayloadUrl,
	getMapRowById,
	mapPayloadName,
	selectMapRows,
} from '@spectralcodex/map-codec';
import { queryOptions, skipToken, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { fetchTimeoutMs } from '#constants.ts';
import { useMapConfig } from '#lib/config.tsx';
import { useMapStore } from '#store/store.tsx';

// Payloads are validated when the build encodes them and share a deploy hash with this script
async function fetchMapJson<Payload>(url: string): Promise<Payload> {
	const response = await fetch(url, { signal: AbortSignal.timeout(fetchTimeoutMs) });

	if (!response.ok) throw new Error(`[Map] Fetch failed: ${String(response.status)} ${url}`);

	return (await response.json()) as Payload;
}

function directoryQueryOptions(url: string) {
	return queryOptions({
		queryFn: async () => decodeMapDirectory(await fetchMapJson<MapDirectoryColumns>(url)),
		queryKey: ['map-directory', url],
	});
}

export function mapRowsQueryOptions(payloadBase: MapPayloadBase, rule: MapFeaturesRule) {
	const url = getMapPayloadUrl(payloadBase, mapPayloadName.directory);

	return queryOptions({
		meta: { isDerived: true },
		queryFn: async ({ client }) =>
			selectMapRows(await client.query(directoryQueryOptions(url)), rule),
		queryKey: ['source-data', url, rule],
	});
}

function chunkQueryOptions(url: string | undefined) {
	return queryOptions({
		queryFn: url
			? async () => decodeMapPopupData(await fetchMapJson<Array<MapPopupItemCompressed>>(url))
			: skipToken,
		queryKey: ['popup-chunk', url],
		// A Chunk from an earlier deploy returns 404, so retry once and then fall back to a title-only popup
		retry: 1,
	});
}

export function scopeListQueryOptions(payloadBase: MapPayloadBase) {
	const url = getMapPayloadUrl(payloadBase, mapPayloadName.scopes);

	return queryOptions({
		queryFn: () => fetchMapJson<Array<MapScopeRow>>(url),
		queryKey: ['scope-list', url],
	});
}

function divisionQueryOptions(url: string | undefined) {
	return queryOptions({
		queryFn: url ? () => fetchMapJson<MapDivisionMask>(url) : skipToken,
		queryKey: ['division-mask', url],
	});
}

export function useMapRows() {
	const { mapFeaturesRule, payloadBase } = useMapConfig();

	return useQuery(mapRowsQueryOptions(payloadBase, mapFeaturesRule));
}

export function useIsMapLoading() {
	const { isLoading: isRowsLoading } = useMapRows();
	const isCanvasLoading = useMapStore((state) => state.isCanvasLoading);

	return isRowsLoading || isCanvasLoading;
}

export function useEnsureMapRows() {
	const client = useQueryClient();
	const { mapFeaturesRule, payloadBase } = useMapConfig();

	return useCallback(
		() => client.query(mapRowsQueryOptions(payloadBase, mapFeaturesRule)),
		[client, mapFeaturesRule, payloadBase],
	);
}

export function useMapRow(id: string | undefined) {
	const { data: rows } = useMapRows();

	return id && rows ? getMapRowById(rows, id) : undefined;
}

export function useMapChunk(chunkKey: string | undefined) {
	const { payloadBase } = useMapConfig();

	return useQuery(
		chunkQueryOptions(chunkKey ? getMapPayloadUrl(payloadBase, chunkKey) : undefined),
	);
}

export function useMapDivision(url: string | undefined) {
	return useQuery(divisionQueryOptions(url));
}
