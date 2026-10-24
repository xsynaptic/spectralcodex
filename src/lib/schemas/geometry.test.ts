import { describe, expect, test } from 'vitest';

import { GeometryPointsArraySchema } from '#lib/schemas/geometry.ts';

describe('GeometryPointsArraySchema', () => {
	const coordinates = [121.5, 25] as const;

	test('every Point of a Location with several needs a title', () => {
		expect(
			GeometryPointsArraySchema.safeParse([
				{ coordinates, title: 'North Block' },
				{ coordinates, title: 'South Block' },
			]).success,
		).toBe(true);
		expect(
			GeometryPointsArraySchema.safeParse([
				{ coordinates, title: 'North Block' },
				{ coordinates, title_zh: '南街' },
			]).success,
		).toBe(false);
	});

	test('a lone Point in a list needs no title', () => {
		expect(GeometryPointsArraySchema.safeParse([{ coordinates }]).success).toBe(true);
	});
});
