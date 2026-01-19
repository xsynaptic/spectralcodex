import type { APIRoute, GetStaticPaths, InferGetStaticPropsType } from 'astro';

import * as R from 'remeda';

import { getLocationsCollection } from '#lib/collections/locations/data.ts';
import { getObjectiveLocations } from '#lib/collections/locations/utils-objectives.ts';
import {
	getLocationsByIdsFunction,
	getLocationsByPostsFunction,
} from '#lib/collections/locations/utils.ts';
import { getPostsCollection } from '#lib/collections/posts/data.ts';
import { getRegionsCollection } from '#lib/collections/regions/data.ts';
import { getResourcesCollection } from '#lib/collections/resources/resources-data.ts';
import { getLocationsByResourceFunction } from '#lib/collections/resources/resources-utils.ts';
import { getSeriesCollection } from '#lib/collections/series/data.ts';
import { getLocationsBySeriesFunction } from '#lib/collections/series/utils.ts';
import { getThemesCollection } from '#lib/collections/themes/data.ts';
import { getLocationsByThemeFunction } from '#lib/collections/themes/utils.ts';
import { getLocationsMapApiData } from '#lib/map/map-locations.ts';

// Note: map API is served in two parts, suffixed to the endpoint URL:
// 1) a highly optimized endpoint with only essential point data
// 2) all the other metadata required for displaying popup items
// This somewhat awkward arrangement is meant to solve the issue of increasingly large payloads
// While reducing round trips to the server and ensuring popups still work instantaneously
export const getStaticPaths = (async () => {
	const { locations } = await getLocationsCollection();
	const { posts } = await getPostsCollection();
	const { regions } = await getRegionsCollection();
	const { resources } = await getResourcesCollection();
	const { series } = await getSeriesCollection();
	const { themes } = await getThemesCollection();

	const getLocationsByIds = await getLocationsByIdsFunction();
	const getLocationsByPosts = await getLocationsByPostsFunction();
	const getLocationsByResource = await getLocationsByResourceFunction();
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
				(locations) => getLocationsMapApiData(locations, `${entry.collection}/${entry.id}`),
			),
		),
	);

	const postsData = R.pipe(
		posts,
		R.filter((entry) => getLocationsByPosts(entry).length > 0),
		R.flatMap((entry) =>
			R.pipe(entry, getLocationsByPosts, (locations) =>
				getLocationsMapApiData(locations, `${entry.collection}/${entry.id}`),
			),
		),
	);

	const regionsData = R.pipe(
		regions,
		R.filter((entry) => !!entry.data.locations && entry.data.locations.length > 0),
		R.flatMap((entry) =>
			R.pipe(entry.data.locations ?? [], getLocationsByIds, (locations) =>
				getLocationsMapApiData(locations, `${entry.collection}/${entry.id}`),
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
				R.filter(R.isDefined),
				(locations) => getLocationsMapApiData(locations, `${entry.collection}/${entry.id}`),
			),
		),
	);

	const themesData = R.pipe(
		themes,
		R.filter((entry) => !!entry.data.locationCount && entry.data.locationCount > 0),
		R.flatMap((entry) =>
			R.pipe(entry, getLocationsByTheme, (locations) =>
				getLocationsMapApiData(locations, `${entry.collection}/${entry.id}`),
			),
		),
	);

	const resourcesData = R.pipe(
		resources,
		R.filter((entry) => entry.data.showPage && entry.data.locationCount && entry.data.locationCount > 0 ? true : false),
		R.flatMap((entry) =>
			R.pipe(entry, getLocationsByResource, (locations) =>
				getLocationsMapApiData(locations, `${entry.collection}/${entry.id}`),
			),
		),
	);

	const objectiveLocations = await getObjectiveLocations();

	const objectivesData = R.pipe(objectiveLocations, (locations) =>
		getLocationsMapApiData(locations, 'objectives', { showAllLocations: true }),
	);

	return R.pipe(
		[
			...locationsData,
			...postsData,
			...regionsData,
			...resourcesData,
			...seriesData,
			...themesData,
			...(objectivesData ?? []),
		],
		R.filter(R.isDefined),
	);
}) satisfies GetStaticPaths;

export const GET = (({ props: { data } }) => {
	return Response.json(data);
}) satisfies APIRoute<InferGetStaticPropsType<typeof getStaticPaths>>;
