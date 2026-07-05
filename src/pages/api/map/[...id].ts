import type { APIRoute, GetStaticPaths, InferGetStaticPropsType } from 'astro';

import { getObjectiveLocations } from '#lib/collections/locations/locations-queries.ts';
import { getMapIndexData } from '#lib/map/map-index.ts';
import {
	getLocationsFeatureCollection,
	getLocationsMapApiHashes,
	getLocationsMapPopupData,
	getLocationsMapSourceData,
} from '#lib/map/map-locations.ts';
import { MapApiDataEnum } from '#lib/map/map-types.ts';

// Shared map delivery: one global point index plus demand-fetched popup chunks
// Objectives keeps a dedicated source/popup pair (includes hidden points, noindex)
export const getStaticPaths = (async () => {
	const { index, chunks } = await getMapIndexData();
	const version = import.meta.env.BUILD_VERSION ?? 'unknown';

	const objectiveLocations = await getObjectiveLocations();
	const objectivesCollection = getLocationsFeatureCollection(objectiveLocations, {
		showAllLocations: true,
	});
	const { sourceHash, popupHash } = getLocationsMapApiHashes(objectivesCollection);

	// Exact versioned URLs for the cache warmer to prefetch; not used by the map island
	const manifestUrls = [
		`/api/map/index.json?v=${version}`,
		...[...chunks.keys()].map((chunkKey) => `/api/map/${chunkKey}.json?v=${version}`),
		`/api/map/objectives/${MapApiDataEnum.Source}?v=${sourceHash}`,
		`/api/map/objectives/${MapApiDataEnum.Popup}?v=${popupHash}`,
	];

	return [
		{ params: { id: 'index.json' }, props: { data: index } },
		...[...chunks].map(([chunkKey, popupItems]) => ({
			params: { id: `${chunkKey}.json` },
			props: { data: popupItems },
		})),
		{
			params: { id: `objectives/${MapApiDataEnum.Source}` },
			props: { data: getLocationsMapSourceData(objectivesCollection) ?? [] },
		},
		{
			params: { id: `objectives/${MapApiDataEnum.Popup}` },
			props: { data: getLocationsMapPopupData(objectivesCollection) ?? [] },
		},
		{ params: { id: 'map-manifest.json' }, props: { data: manifestUrls } },
	];
}) satisfies GetStaticPaths;

export const GET = (({ props: { data } }) => {
	return Response.json(data);
}) satisfies APIRoute<InferGetStaticPropsType<typeof getStaticPaths>>;
