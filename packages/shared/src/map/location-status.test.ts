import { describe, expect, test } from 'vitest';

import { locationStatusOrder } from '#map/location-status.ts';
import { LocationStatusEnum } from '#map/map-locations.ts';

describe('locationStatusOrder', () => {
	test('lists every location status exactly once', () => {
		const statuses = Object.values(LocationStatusEnum);

		expect(locationStatusOrder).toHaveLength(statuses.length);
		expect(new Set(locationStatusOrder)).toEqual(new Set(statuses));
	});
});
