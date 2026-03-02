import * as R from 'remeda';

import { getLocationsCollection } from '#lib/collections/locations/locations-data.ts';
import { createRegionsByIdsFunction } from '#lib/collections/regions/regions-utils.ts';

// Saved queries for use in MDX and other places
// TODO: this should eventually be handled via user authentication
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
