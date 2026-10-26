import { describe, expect, test } from 'vitest';

import { getChronologyPeriodKeys } from '#og-image/chronology.ts';

describe('getChronologyPeriodKeys', () => {
	test('keys a late-evening UTC instant in its UTC month', () => {
		expect(getChronologyPeriodKeys(new Date('2024-05-31T20:00:00Z'))).toEqual(['2024', '2024-05']);
	});
});
