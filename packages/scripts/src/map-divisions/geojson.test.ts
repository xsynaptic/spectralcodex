import type { Polygon } from 'geojson';

import { booleanPointInPolygon } from '@turf/boolean-point-in-polygon';
import { feature, featureCollection } from '@turf/helpers';
import { coordAll } from '@turf/meta';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import * as R from 'remeda';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { saveDivisionMask } from '#map-divisions/geojson.ts';

const taipeiDivisionPath = path.join(
	import.meta.dirname,
	'../validate-content/fixtures/ed2e460a-8832-472f-a8fe-54be8c2c6d16.geojson',
);

const taipeiCoordinates: [number, number] = [121.5654, 25.033];
const tainanCoordinates: [number, number] = [120.2027, 22.9917];

function countDecimals(value: number) {
	return String(value).split('.', 2)[1]?.length ?? 0;
}

describe('saveDivisionMask', () => {
	let outputDir: string | undefined;

	afterEach(async () => {
		if (outputDir) await rm(outputDir, { force: true, recursive: true });
	});

	test('the mask covers everything outside the Division, with coordinates rounded to six decimals', async () => {
		vi.spyOn(console, 'log').mockImplementation(R.doNothing());
		outputDir = await mkdtemp(path.join(tmpdir(), 'division-mask-'));

		const division = JSON.parse(await readFile(taipeiDivisionPath, 'utf8')) as Polygon;

		await saveDivisionMask(featureCollection([feature(division)]), 'taipei', outputDir);

		const mask = JSON.parse(await readFile(path.join(outputDir, 'taipei.json'), 'utf8')) as Polygon;
		const decimals = coordAll(feature(mask)).flatMap((position) => position.map(countDecimals));

		expect(booleanPointInPolygon(taipeiCoordinates, mask)).toBe(false);
		expect(booleanPointInPolygon(tainanCoordinates, mask)).toBe(true);
		expect(Math.max(...decimals)).toBeLessThanOrEqual(6);
	});
});
