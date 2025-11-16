import { feature, featureCollection } from '@turf/helpers';
import { union } from '@turf/turf';

import type { DivisionFeatureCollection, DivisionItem } from './types';

export function convertToFeatureCollection(divisionItems: Array<DivisionItem>) {
	const divisionFeatureCollection = (() => {
		if (divisionItems.length === 1 && divisionItems[0]) {
			return featureCollection([
				feature(divisionItems[0].geometry, undefined, {
					id: divisionItems[0].divisionId,
				}),
			]);
		}

		if (divisionItems.length > 1) {
			const divisionItemsUnion = union(
				featureCollection(
					divisionItems.map((divisionItem) =>
						feature(divisionItem.geometry, undefined, {
							id: divisionItem.divisionId,
						}),
					),
				),
			);

			if (divisionItemsUnion) {
				return featureCollection([feature(divisionItemsUnion.geometry)]);
			}
		}

		return featureCollection([]) satisfies DivisionFeatureCollection;
	})();

	if (divisionFeatureCollection.features.length === 0) {
		return featureCollection([]);
	}

	return divisionFeatureCollection;
}
