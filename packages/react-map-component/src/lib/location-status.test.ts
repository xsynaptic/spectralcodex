import { LocationStatusEnum } from '@spectralcodex/shared/map';
import { describe, expect, test } from 'vitest';

import { locationStatusOrder } from '#lib/location-status.ts';

describe('locationStatusOrder', () => {
	test('lists every location status exactly once', () => {
		const statuses = Object.values(LocationStatusEnum);

		expect(locationStatusOrder).toHaveLength(statuses.length);
		expect(new Set(locationStatusOrder)).toEqual(new Set(statuses));
	});
});
