import { LocationStatusEnum } from '@spectralcodex/shared/map';
import * as R from 'remeda';

import { getLocationsCollection } from '#lib/collections/locations/locations-data.ts';
import { sortLocationsByLatitude } from '#lib/collections/locations/locations-utils.ts';

// Saved queries for use in MDX and other places
// TODO: this should eventually end up in a database or something
export async function getTheaterLocations() {
	const { locations } = await getLocationsCollection();

	const theaterLocations = R.pipe(
		locations,
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
					!R.isIncludedIn(data.status, [LocationStatusEnum.Demolished, LocationStatusEnum.Unknown]),
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
