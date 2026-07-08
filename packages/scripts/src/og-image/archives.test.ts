import { describe, expect, test } from 'vitest';

import { getArchivePeriodKeys } from './archives';

describe('getArchivePeriodKeys', () => {
	test('keys a late-evening UTC instant in its UTC month', () => {
		expect(getArchivePeriodKeys(new Date('2024-05-31T20:00:00Z'))).toEqual(['2024', '2024-05']);
	});

	test('keys UTC midnight at a month boundary in the new month', () => {
		expect(getArchivePeriodKeys(new Date('2024-06-01T00:00:00Z'))).toEqual(['2024', '2024-06']);
	});
});
