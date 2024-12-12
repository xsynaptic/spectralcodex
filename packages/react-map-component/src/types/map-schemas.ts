import * as R from 'remeda';
import { z } from 'zod';

import { LocationCategoryEnum, LocationStatusEnum } from './map-locations';

const NumericScaleSchema = z.number().int().min(1).max(5);

export const MapLocationCategoryMap = R.mapToObj(R.values(LocationCategoryEnum), (value, i) => [
	value,
	i,
]);

export const MapLocationStatusMap = R.mapToObj(R.values(LocationStatusEnum), (value, i) => [
	value,
	i,
]);

export const MapGeometryTypeMap = {
	Point: 0,
	MultiPoint: 1,
	LineString: 2,
} as const;

export const MapSourceDataSchema = z
	.object({
		i: z.string(), // ID
		c: z.nativeEnum(MapLocationCategoryMap), // Category
		s: z.nativeEnum(MapLocationStatusMap), // Status
		p: NumericScaleSchema, // Precision
		q: NumericScaleSchema, // Quality
		r: NumericScaleSchema, // Rating
		o: NumericScaleSchema.optional(), // Objective
		l: z.boolean().optional(),
		g: z.object({
			t: z.nativeEnum(MapGeometryTypeMap),
			x: z.union([z.tuple([z.number(), z.number()]), z.tuple([z.number(), z.number()]).array()]),
		}),
	})
	.transform((value) => ({
		properties: {
			id: value.i,
			category: R.invert(MapLocationCategoryMap)[value.c] ?? ('unknown' as const),
			status: R.invert(MapLocationStatusMap)[value.s] ?? ('unknown' as const),
			precision: value.p,
			quality: value.q,
			rating: value.r,
			objective: value.o,
			outlier: value.l,
		},
		geometry: {
			type: R.invert(MapGeometryTypeMap)[value.g.t],
			coordinates: value.g.x,
		},
	}))
	.array();

export const MapPopupDataSchema = z
	.object({
		i: z.string(), // ID
		t: z.string(), // Title
		a: z.string().optional(), // Title (alt)
		u: z.string().optional(), // URL
		d: z.string().optional(), // Description
		s: NumericScaleSchema.optional(), // Safety
		g: z.string().url().optional(), // Google URL
		w: z.string().url().optional(), // Wikipedia URL
		m: z
			.object({
				src: z.string(),
				srcSet: z.string(),
				height: z.string(),
				width: z.string(),
			})
			.optional(),
	})
	.transform((value) => ({
		id: value.i,
		title: value.t,
		titleAlt: value.a,
		url: value.u,
		description: value.d,
		safety: value.s,
		googleMapsUrl: value.g,
		wikipediaUrl: value.w,
		image: value.m,
	}))
	.array();
