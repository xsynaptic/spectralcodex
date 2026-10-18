import type { MapFeaturesRule, MapPayloadBase } from '@spectralcodex/map-codec';
import type { z } from 'zod';

import {
	getMapPayloadUrl,
	getMapRowById,
	MapDivisionMaskSchema,
	mapPayloadName,
	MapPopupItemSchema,
	MapScopeRowSchema,
	MapSourceItemSchema,
	selectMapRows,
} from '@spectralcodex/map-codec';
import { queryOptions, skipToken, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { fetchTimeoutMs } from '#constants.ts';
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

function directoryQueryOptions(url: string) {
	return queryOptions({
		queryFn: () => fetchMapJson(url, MapSourceItemSchema.array()),
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
		queryFn: url ? () => fetchMapJson(url, MapPopupItemSchema.array()) : skipToken,
		queryKey: ['popup-chunk', url],
		// A Chunk from an earlier deploy returns 404, so retry once and then fall back to a title-only popup
		retry: 1,
	});
}

export function scopeListQueryOptions(payloadBase: MapPayloadBase) {
	const url = getMapPayloadUrl(payloadBase, mapPayloadName.scopes);

	return queryOptions({
		queryFn: () => fetchMapJson(url, MapScopeRowSchema.array()),
		queryKey: ['scope-list', url],
	});
}

function divisionQueryOptions(url: string | undefined) {
	return queryOptions({
		queryFn: url ? () => fetchMapJson(url, MapDivisionMaskSchema) : skipToken,
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
