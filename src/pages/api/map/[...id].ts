import type { APIRoute, GetStaticPaths, InferGetStaticPropsType } from 'astro';

import { encodeMapPopupData, encodeMapSourceData } from '@spectralcodex/map-codec';

import { getObjectiveLocations } from '#lib/collections/locations/locations-queries.ts';
import { getMapDirectoryData } from '#lib/map/map-directory.ts';
import {
	getLocationsFeatureCollection,
	getLocationsMapPopupData,
	getLocationsMapSourceData,
} from '#lib/map/map-locations.ts';
import { MapApiDataEnum } from '#lib/map/map-types.ts';

// Shared map delivery: one global point directory plus demand-fetched popup chunks
export const getStaticPaths = (async () => {
	const { directory, chunks, version } = await getMapDirectoryData();

	const objectiveLocations = await getObjectiveLocations();
	const objectivesCollection = getLocationsFeatureCollection(objectiveLocations, {
		hideSensitiveLocations: false,
	});
	const objectivesSourceData = getLocationsMapSourceData(objectivesCollection);
	const objectivesPopupData = getLocationsMapPopupData(objectivesCollection);

	// Exact versioned URLs for the cache warmer to prefetch; not used by the map island
	const manifestUrls = [
		`/api/map/map-directory.json?v=${version}`,
		...[...chunks.keys()].map((chunkKey) => `/api/map/${chunkKey}.json?v=${version}`),
	];

	return [
		{ params: { id: 'map-directory.json' }, props: { data: encodeMapSourceData(directory) } },
		...[...chunks].map(([chunkKey, popupItems]) => ({
			params: { id: `${chunkKey}.json` },
			props: { data: encodeMapPopupData(popupItems) },
		})),
		{
			params: { id: `objectives/${MapApiDataEnum.Source}` },
			props: { data: encodeMapSourceData(objectivesSourceData ?? []) },
		},
		{
			params: { id: `objectives/${MapApiDataEnum.Popup}` },
			props: { data: encodeMapPopupData(objectivesPopupData ?? []) },
		},
		{ params: { id: 'map-manifest.json' }, props: { data: manifestUrls } },
	];
}) satisfies GetStaticPaths;

export const GET = (({ props: { data } }) => {
	return Response.json(data);
}) satisfies APIRoute<InferGetStaticPropsType<typeof getStaticPaths>>;
