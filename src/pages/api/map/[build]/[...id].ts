import * as R from 'remeda';

import type { APIRoute, GetStaticPaths, InferGetStaticPropsType } from 'astro';

import { MAP_API_POPUP_ID, MAP_API_SOURCE_ID } from '@/constants';
import { getLocationsCollection } from '@/lib/collections/locations/data';
import {
	getLocationsByIdsFunction,
	getLocationsByPostsFunction,
} from '@/lib/collections/locations/utils';
import { getObjectiveLocations } from '@/lib/collections/locations/utils-objectives';
import { getPostsCollection } from '@/lib/collections/posts/data';
import { getRegionsCollection } from '@/lib/collections/regions/data';
import { getSeriesCollection } from '@/lib/collections/series/data';
import { getLocationsBySeriesFunction } from '@/lib/collections/series/utils';
import { getThemesCollection } from '@/lib/collections/themes/data';
import { getLocationsByThemeFunction } from '@/lib/collections/themes/utils';
import { getLocationsMapApiData } from '@/lib/map/map-locations';
import { generateApiResponse } from '@/lib/utils/api';

const build = import.meta.env.BUILD_ID;

// Split the API into source and popup data
function getMapApiId(index: number) {
	return index === 0 ? MAP_API_SOURCE_ID : MAP_API_POPUP_ID;
}

// Note: map API is served in two numbered parts, suffixed to the endpoint URL:
// 1) a highly optimized endpoint with only point data
// 2) all the other metadata required for displaying popup items
// This somewhat awkward arrangement is meant to solve the issue of increasingly large payloads
export const getStaticPaths = (async () => {
	const { locations } = await getLocationsCollection();
	const { posts } = await getPostsCollection();
	const { regions } = await getRegionsCollection();
	const { series } = await getSeriesCollection();
	const { themes } = await getThemesCollection();

	const getLocationsByIds = await getLocationsByIdsFunction();
	const getLocationsByPosts = await getLocationsByPostsFunction();
	const getLocationsByTheme = await getLocationsByThemeFunction();
	const getLocationsBySeries = await getLocationsBySeriesFunction();

	const locationsData = R.pipe(
		locations,
		R.flatMap((entry) =>
			R.pipe(
				[
					entry.id,
					...(entry.data.nearby ? entry.data.nearby.map(({ locationId }) => locationId) : []),
				],
				getLocationsByIds,
				getLocationsMapApiData,
				R.map((data, index) => ({
					params: {
						id: `${entry.collection}/${entry.id}/${getMapApiId(index)}`,
						build,
					},
					props: { data },
				})),
			),
		),
	);

	const postsData = R.pipe(
		posts,
		R.filter((entry) => getLocationsByPosts(entry).length > 0),
		R.flatMap((entry) =>
			R.pipe(
				entry,
				getLocationsByPosts,
				getLocationsMapApiData,
				R.map((data, index) => ({
					params: { id: `${entry.collection}/${entry.id}/${getMapApiId(index)}`, build },
					props: { data },
				})),
			),
		),
	);

	const regionsData = R.pipe(
		regions,
		R.filter((entry) => !!entry.data.locations && entry.data.locations.length > 0),
		R.flatMap((entry) =>
			R.pipe(
				entry.data.locations ?? [],
				getLocationsByIds,
				getLocationsMapApiData,
				R.map((data, index) => ({
					params: { id: `${entry.collection}/${entry.id}/${getMapApiId(index)}`, build },
					props: { data },
				})),
			),
		),
	);

	// Note: for series we have to filter *after* gathering location data
	const seriesData = R.pipe(
		series,
		R.flatMap((entry) =>
			R.pipe(
				entry.data.seriesItems ?? [],
				getLocationsBySeries,
				R.filter((item) => !!item),
				getLocationsMapApiData,
				R.map((data, index) => ({
					params: { id: `${entry.collection}/${entry.id}/${getMapApiId(index)}`, build },
					props: { data },
				})),
			),
		),
	);

	const themesData = R.pipe(
		themes,
		R.filter((entry) => !!entry.data.locationCount && entry.data.locationCount > 0),
		R.flatMap((entry) =>
			R.pipe(
				entry,
				getLocationsByTheme,
				getLocationsMapApiData,
				R.map((data, index) => ({
					params: { id: `${entry.collection}/${entry.id}/${getMapApiId(index)}`, build },
					props: { data },
				})),
			),
		),
	);

	const objectiveLocations = await getObjectiveLocations();

	const objectivesData = R.pipe(
		objectiveLocations,
		(locations) => getLocationsMapApiData(locations, { showHiddenLocations: true }),
		R.map((data, index) => ({
			params: { id: `objectives/${getMapApiId(index)}`, build },
			props: { data },
		})),
	);

	return [
		...locationsData,
		...postsData,
		...regionsData,
		...seriesData,
		...themesData,
		...objectivesData,
	];
}) satisfies GetStaticPaths;

export const GET = (({ props: { data } }) => {
	return generateApiResponse(JSON.stringify(data));
}) satisfies APIRoute<InferGetStaticPropsType<typeof getStaticPaths>>;
