import type { MapFeaturesRule, MapSourceItem } from '@spectralcodex/map-codec';
import type { MapComponentProps } from '@spectralcodex/react-map-component';

import { selectMapRows } from '@spectralcodex/map-codec';
import { MAP_PROTOMAPS_API_KEY } from 'astro:env/client';
import { IMAGE_SERVER_URL } from 'astro:env/server';

import type { MapBoundsOptions } from '#lib/map/map-bounds.ts';
import type { MapDatasetName } from '#lib/map/map-directory.ts';

import { getMapBounds, isTargetFeature } from '#lib/map/map-bounds.ts';
import { getMapDirectoryData } from '#lib/map/map-directory.ts';

export type MapComponentData =
	| { hasGeodata: false; prefetchUrls?: never; props?: never }
	| { hasGeodata: true; prefetchUrls: Array<string>; props: MapComponentProps };

type MapDataOptions = MapBoundsOptions &
	Omit<
		MapComponentProps,
		| 'apiSourceUrl'
		| 'bounds'
		| 'center'
		| 'mapFeaturesRule'
		| 'maxBounds'
		| 'protomapsApiKey'
		| 'targetIds'
	> & {
		dataset?: MapDatasetName | undefined;
		rule: MapFeaturesRule;
	};

export async function createMapDataFunction() {
	const { datasets } = await getMapDirectoryData();

	return function getMapData({
		boundsBuffer,
		boundsBufferPercentage,
		dataset = 'shared',
		limitsBuffer,
		limitsBufferPercentage,
		rule,
		targetId,
		...props
	}: MapDataOptions): MapComponentData {
		const { directory, directoryUrl: apiSourceUrl } = datasets[dataset];
		const rows = selectMapRows(directory, rule);
		const mapBounds = getMapBounds(rows, {
			boundsBuffer,
			boundsBufferPercentage,
			limitsBuffer,
			limitsBufferPercentage,
			targetId,
		});

		if (!mapBounds) return { hasGeodata: false };

		const mapProps = {
			imageServerUrl: IMAGE_SERVER_URL,
			isDev: import.meta.env.DEV,
			protomapsApiKey: MAP_PROTOMAPS_API_KEY,
			...mapBounds,
			...props,
			apiSourceUrl,
			mapFeaturesRule: rule,
			targetIds: getTargetIds(rows, targetId),
		};

		return { hasGeodata: true, prefetchUrls: [apiSourceUrl], props: mapProps };
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

function getTargetIds(rows: ReadonlyArray<MapSourceItem>, targetId: string | undefined) {
	if (!targetId) return;

	return rows
		.filter(({ properties }) => isTargetFeature(properties.id, targetId))
		.map(({ properties }) => properties.id);
}
