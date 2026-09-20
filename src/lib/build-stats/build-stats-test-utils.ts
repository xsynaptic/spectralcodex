import type { BuildRecord } from '#lib/build-stats/build-stats-loader.ts';

import { millisecondsPerDay } from '#constants.ts';

export const dayZero = Date.UTC(2026, 0, 1);

export function buildRecord(
	dayOffset: number,
	durationSeconds: number,
	rest: Partial<BuildRecord> = {},
) {
	return {
		durationSeconds,
		timestamp: new Date(dayZero + dayOffset * millisecondsPerDay).toISOString(),
		...rest,
	} satisfies BuildRecord;
}
