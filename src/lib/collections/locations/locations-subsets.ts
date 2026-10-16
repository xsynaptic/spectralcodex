import { LocationStatusEnum } from '@spectralcodex/shared/map';
import * as R from 'remeda';

import { atlasRegionId } from '#constants.ts';
import { getLocationsCollection } from '#lib/collections/locations/locations-data.ts';
import { sortLocationsByLatitude } from '#lib/collections/locations/locations-geometry.ts';
import { createRegionsByIdsFunction } from '#lib/collections/regions/regions-data.ts';

export async function getObjectiveLocations() {
	const { entries } = await getLocationsCollection();

	const getRegionsByIds = await createRegionsByIdsFunction();

	return R.pipe(
		entries,
		R.filter((entry) => !!entry.data.objective && entry.data.objective >= 1),
		R.filter((entry) =>
			getRegionsByIds(entry.data.regions.map(({ id }) => id)).some(
				(region) => region.id === atlasRegionId || region.data._ancestors?.includes(atlasRegionId),
			),
		),
	);
}

export async function getTheaterLocations() {
	const { entries } = await getLocationsCollection();

	const theaterLocations = R.pipe(
		entries,
		R.filter(({ data }) => !!data.themes?.find(({ id }) => id === 'taiwan-theaters')),
	);

	return {
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
	};
}
