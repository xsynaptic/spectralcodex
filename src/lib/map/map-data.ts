import type { MapFeaturesRule, MapSourceItem } from '@spectralcodex/map-codec';
import type { MapComponentProps } from '@spectralcodex/react-map-component';

import { selectMapRows } from '@spectralcodex/map-codec';
import { MAP_PROTOMAPS_API_KEY } from 'astro:env/client';

import type { MapBoundsOptions } from '#lib/map/map-bounds.ts';
import type { MapDatasetName } from '#lib/map/map-directory.ts';
import type { MapScopeEntry } from '#lib/map/map-entry-rules.ts';

import { createFirstRegionByReferenceFunction } from '#lib/collections/regions/regions-data.ts';
import { getMapLanguages } from '#lib/i18n/i18n-utils.ts';
import { imageBaseUrl } from '#lib/image/image-url.ts';
import { getMapBounds } from '#lib/map/map-bounds.ts';
import { getMapDirectoryData } from '#lib/map/map-directory.ts';
import { createEntryMapRuleFunction } from '#lib/map/map-entry-rules.ts';
import { isEntryMapEnabled } from '#lib/map/map-locations.ts';

export type MapComponentData =
	{ hasGeodata: false; props?: never } | { hasGeodata: true; props: MapComponentProps };

type MapDataOptions = MapBoundsOptions &
	Omit<
		MapComponentProps,
		'bounds' | 'center' | 'mapFeaturesRule' | 'maxBounds' | 'payloadBase' | 'protomapsApiKey'
	> & {
		dataset?: MapDatasetName | undefined;
		limitRule?: MapFeaturesRule | undefined;
		rule: MapFeaturesRule;
	};

export async function createMapDataFunction() {
	const { datasets } = await getMapDirectoryData();
	const rowsByRuleByDataset: Record<
		MapDatasetName,
		WeakMap<MapFeaturesRule, Array<MapSourceItem>>
	> = { objectives: new WeakMap(), shared: new WeakMap() };

	function selectDatasetRows(dataset: MapDatasetName, rule: MapFeaturesRule) {
		const rowsByRule = rowsByRuleByDataset[dataset];
		const cachedRows = rowsByRule.get(rule);

		if (cachedRows) return cachedRows;

		const rows = selectMapRows(datasets[dataset].directory, rule);

		rowsByRule.set(rule, rows);

		return rows;
	}

	return function getMapData({
		boundsBuffer,
		boundsBufferPercentage,
		dataset = 'shared',
		limitRule,
		limitsBuffer,
		limitsBufferPercentage,
		rule,
		targetIds,
		...props
	}: MapDataOptions): MapComponentData {
		const { payloadBase } = datasets[dataset];
		const rows = selectDatasetRows(dataset, rule);
		const targetRows = targetIds ? selectMapRows(rows, { ids: targetIds, type: 'ids' }) : [];
		const mapBounds = getMapBounds(rows, {
			boundsBuffer,
			boundsBufferPercentage,
			limitRows: limitRule ? selectDatasetRows(dataset, limitRule) : rows,
			limitsBuffer,
			limitsBufferPercentage,
			targetRows,
		});

		if (!mapBounds) return { hasGeodata: false };

		const mapProps = {
			imageBaseUrl,
			isDev: import.meta.env.DEV,
			protomapsApiKey: MAP_PROTOMAPS_API_KEY,
			...mapBounds,
			...props,
			mapFeaturesRule: rule,
			payloadBase,
			targetIds: targetIds ? targetRows.map(({ properties }) => properties.id) : undefined,
		};

		return { hasGeodata: true, props: mapProps };
	};
}

export async function createEntryMapDataFunction() {
	const getMapData = await createMapDataFunction();
	const getEntryMapRule = await createEntryMapRuleFunction();
	const getFirstRegionByReference = await createFirstRegionByReferenceFunction();
	const { divisionUrlById } = await getMapDirectoryData();

	return function getEntryMapData(entry: MapScopeEntry): MapComponentData {
		if (!isEntryMapEnabled(entry)) return { hasGeodata: false };

		if (entry.collection === 'regions') {
			const divisionUrl = divisionUrlById.get(entry.id);

			return getMapData({
				mapId: `${entry.collection}/${entry.id}`,
				rule: getEntryMapRule(entry),
				...getMapLanguages(entry.data._langCode),
				...(divisionUrl ? { apiDivisionUrl: divisionUrl } : {}),
			});
		}

		return getMapData({
			mapId: `${entry.collection}/${entry.id}`,
			rule: getEntryMapRule(entry),
			...getMapLanguages(getFirstRegionByReference(entry.data.regions)?.data._langCode),
		});
	};
}

export async function getObjectiveMapData() {
	const getMapData = await createMapDataFunction();
	const { atlasRule } = await getMapDirectoryData();

	return getMapData({
		dataset: 'objectives',
		isObjectiveFilterEnabled: true,
		mapId: 'objectives',
		rule: atlasRule,
	});
}
