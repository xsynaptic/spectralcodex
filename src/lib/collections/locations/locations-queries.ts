import { LocationStatusEnum } from '@spectralcodex/shared/map';
import * as R from 'remeda';

import { getLocationsCollection } from '#lib/collections/locations/locations-data.ts';
import { sortLocationsByLatitude } from '#lib/collections/locations/locations-utils.ts';
import { createRegionsByIdsFunction } from '#lib/collections/regions/regions-utils.ts';
import { getMapData } from '#lib/map/map-data.ts';
import { getLocationsFeatureCollection } from '#lib/map/map-locations.ts';

// Saved queries for use in MDX and other places
// TODO: these should eventually be handled via user authentication and/or a database

export async function getObjectiveLocations() {
	const { entries } = await getLocationsCollection();

	const getRegionsByIds = await createRegionsByIdsFunction();

	return R.pipe(
		entries,
		R.filter((entry) => !!entry.data.objective && entry.data.objective >= 1),
		R.filter((entry) =>
			getRegionsByIds(entry.data.regions.map(({ id }) => id)).some(
				(region) => region.id === 'taiwan' || region.data._ancestors?.includes('taiwan'),
			),
		),
	);
}

export async function getObjectiveMapData() {
	const objectiveLocations = await getObjectiveLocations();

	return getMapData({
		mapId: 'objectives',
		featureCollection: getLocationsFeatureCollection(objectiveLocations, {
			showAllLocations: true,
		}),
		showObjectiveFilter: true,
	});
}

export async function getTheaterLocations() {
	const { entries } = await getLocationsCollection();

	const theaterLocations = R.pipe(
		entries,
		R.filter(({ data }) => !!data.themes?.find(({ id }) => id === 'taiwan-theaters')),
	);

	return {
		theaterLocationsLowPrecision: R.pipe(
			theaterLocations,
			R.filter(({ data }) => data.precision === 1),
			R.sort(sortLocationsByLatitude),
		),
		theaterLocationsRoughPrecision: R.pipe(
			theaterLocations,
			R.filter(({ data }) => data.precision === 2),
			R.sort(sortLocationsByLatitude),
		),
		theaterLocationsUnknownStatus: R.pipe(
			theaterLocations,
			R.filter(({ data }) => data.precision >= 3 && data.status === LocationStatusEnum.Unknown),
			R.sort(sortLocationsByLatitude),
		),
		theaterLocationsJapanese: R.pipe(
			theaterLocations,
			R.filter(
				({ data }) => !!data.themes?.find(({ id }) => id === 'taiwan-japanese-colonial-era'),
			),
			R.filter(
				({ data }) =>
					!R.isIncludedIn(data.status, [LocationStatusEnum.Vanished, LocationStatusEnum.Unknown]),
			),
			R.sort(sortLocationsByLatitude),
		),
		theaterLocationsObjectivesTop: R.pipe(
			theaterLocations,
			R.filter(({ data }) => data.objective !== undefined && data.objective >= 4),
			R.sort(sortLocationsByLatitude),
		),
		theaterLocationsObjectivesAll: R.pipe(
			theaterLocations,
			R.filter(
				({ data }) => data.objective !== undefined && data.objective > 1 && data.objective < 4,
			),
			R.sort(sortLocationsByLatitude),
		),
	};
}
