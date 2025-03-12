import type { LineString, MultiPoint, Point } from 'geojson';

import { z } from 'astro:content';
import * as R from 'remeda';

import { getTruncatedLngLat } from '#lib/map/map-utils.ts';

const GeometryTypeEnum = {
	Point: 'Point',
	MultiPoint: 'MultiPoint',
	LineString: 'LineString',
} as const;

const GeometryPointSchema = z.object({
	type: z.literal(GeometryTypeEnum.Point),
	coordinates: z.tuple([z.number(), z.number()]),
});

const GeometryMultiPointSchema = z.object({
	type: z.literal(GeometryTypeEnum.MultiPoint),
	coordinates: z.tuple([z.number(), z.number()]).array().nonempty(),
});

const GeometryLineStringSchema = z.object({
	type: z.literal(GeometryTypeEnum.LineString),
	coordinates: z.tuple([z.number(), z.number()]).array().nonempty().min(2),
});

function validateCoordinates(coordinates: [number, number]): z.IssueData | undefined {
	if (!coordinates[0] || !coordinates[1]) {
		return {
			code: z.ZodIssueCode.custom,
			message: `Coordinates should be an array of two numbers.`,
		};
	}
	if (!coordinates[0] || !coordinates[1]) {
		return {
			code: z.ZodIssueCode.custom,
			message: `Coordinates should be an array of two numbers.`,
		};
	}
	if (coordinates[0] < -180 || coordinates[0] > 180) {
		return {
			code: z.ZodIssueCode.custom,
			message: `Longitude should be between 180 and -180; value was "${String(coordinates[0])}".`,
		};
	}
	if (coordinates[1] < -90 || coordinates[1] > 90) {
		return {
			code: z.ZodIssueCode.custom,
			message: `Latitude should be between 90 and -90; value was "${String(coordinates[1])}".`,
		};
	}
	return;
}

// GeoJSON geometry; currently we only support Point
export const GeometrySchema = z
	.discriminatedUnion('type', [
		GeometryPointSchema,
		GeometryMultiPointSchema,
		GeometryLineStringSchema,
	])
	.transform((value, ctx) => {
		if (!R.isIncludedIn(value.type, R.values(GeometryTypeEnum))) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: `Geometry type "${value.type}" is not supported.`,
			});
			return z.NEVER;
		}

		if (value.type === GeometryTypeEnum.Point) {
			const issueData = validateCoordinates(value.coordinates);

			if (issueData) {
				ctx.addIssue(issueData);
				return z.NEVER;
			}

			return {
				...value,
				coordinates: getTruncatedLngLat(value.coordinates),
			} satisfies Point;
		}

		if (value.type === GeometryTypeEnum.MultiPoint) {
			for (const coordinates of value.coordinates) {
				const issueData = validateCoordinates(coordinates);

				if (issueData) {
					ctx.addIssue(issueData);
					return z.NEVER;
				}
			}

			return {
				...value,
				coordinates: value.coordinates.map(getTruncatedLngLat),
			} satisfies MultiPoint;
		}

		// Value is LineString
		if (value.coordinates.length < 2) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: `Geometry type "${value.type}" requires at least two coordinates in the array.`,
			});
			return z.NEVER;
		}

		for (const coordinates of value.coordinates) {
			const issueData = validateCoordinates(coordinates);

			if (issueData) {
				ctx.addIssue(issueData);
				return z.NEVER;
			}
		}

		return {
			...value,
			coordinates: value.coordinates.map(getTruncatedLngLat),
		} satisfies LineString;
	});
