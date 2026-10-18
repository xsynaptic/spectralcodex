import { GeometryTypeEnum, LocationStatusEnum } from '@spectralcodex/shared/map';
import { z } from 'zod';

import { coded, createFieldCodec, field, keysOf, plain, withFallback } from '#codec-fields.ts';
import { LocationStatusNumericMapping } from '#map-codes.ts';

export const MapPositionSchema = z.tuple([z.number(), z.number()]);

const geometryCodec = z.codec(
	MapPositionSchema,
	z.object({ coordinates: MapPositionSchema, type: z.literal(GeometryTypeEnum.Point) }),
	{
		decode: (coordinates) => ({ coordinates, type: GeometryTypeEnum.Point }),
		encode: ({ coordinates }) => coordinates,
	},
);

const sourceCodec = createFieldCodec({
	chunkKey: plain('k', z.string().optional()),
	entryQuality: withFallback('f', z.number().int(), 1),
	hasImage: withFallback('n', z.boolean(), false),
	id: plain('i', z.string()),
	objective: plain('o', z.number().int().optional()),
	outlier: plain('l', z.boolean().optional()),
	pointTitle: plain('q', z.string().optional()),
	precision: plain('p', z.number().int()),
	rating: plain('r', z.number().int()),
	regionOrdinals: plain('b', z.number().int().array().optional()),
	status: coded('s', LocationStatusNumericMapping, LocationStatusEnum.Unknown),
	themeIndices: plain('h', z.number().int().array().optional()),
	title: plain('t', z.string()),
	titleMultilingual: plain('v', z.string().optional()),
	url: plain('u', z.string().optional()),
});

const googleMapsHost = 'https://maps.app.goo.gl/';

function shortenUrl(url: string | undefined, host?: string) {
	if (!url) return;
	if (host && url.startsWith(host)) return url.slice(host.length);

	return url.replace('https://', '');
}

function expandUrl(value: string | undefined, host?: string) {
	if (!value) return;
	if (value.includes('://')) return value;
	if (host && !value.includes('/')) return `${host}${value}`;

	return `https://${value}`;
}

function url(key: string, host?: string) {
	return field(key, {
		compressed: z.string().optional(),
		decode: (value) => expandUrl(value, host),
		encode: (value) => shortenUrl(value, host),
		standard: z.string().optional(),
	});
}

const popupCodec = createFieldCodec({
	description: plain('d', z.string().optional()),
	googleMapsUrl: url('m', googleMapsHost),
	id: plain('i', z.string()),
	image: field('y', {
		compressed: z.string().optional(),
		decode: (srcSet) => (srcSet ? { srcSet } : undefined),
		encode: (image) => image?.srcSet,
		standard: z.object({ srcSet: z.string() }).optional(),
	}),
	own: plain('z', z.number().int().optional()),
	title: plain('t', z.string()),
	titleMultilingualLang: plain('a', z.string().optional()),
	titleMultilingualValue: plain('v', z.string().optional()),
	wikipediaUrl: url('w'),
});

const geometryKey = 'g';

export const mapSourceKeys = { ...sourceCodec.keys, geometry: geometryKey } as const;
export const mapPopupKeys = popupCodec.keys;

export const MapSourceItemSchema = z.codec(
	z.object({ ...sourceCodec.compressedShape, [geometryKey]: geometryCodec.in }).strict(),
	z.object({
		geometry: geometryCodec.out,
		properties: z.object(sourceCodec.standardShape),
		type: z.literal('Feature'),
	}),
	{
		decode: (data) => ({
			geometry: z.decode(geometryCodec, data[geometryKey]),
			properties: sourceCodec.decode(data),
			type: 'Feature' as const,
		}),
		encode: ({ geometry, properties }) => ({
			...sourceCodec.encode(properties),
			[geometryKey]: z.encode(geometryCodec, geometry),
		}),
	},
);

export const MapPopupItemSchema = z.codec(
	z.object(popupCodec.compressedShape).strict(),
	z.object(popupCodec.standardShape),
	{ decode: popupCodec.decode, encode: popupCodec.encode },
);

export type MapPopupItem = z.output<typeof MapPopupItemSchema>;
export type MapPopupItemCompressed = z.input<typeof MapPopupItemSchema>;

export type MapSourceItem = z.output<typeof MapSourceItemSchema>;
export type MapSourceItemCompressed = z.input<typeof MapSourceItemSchema>;

export type MapFeatureProperties = Omit<MapPopupItem, 'id'> &
	Omit<
		MapSourceItem['properties'],
		'chunkKey' | 'hasImage' | 'id' | 'regionOrdinals' | 'themeIndices' | 'titleMultilingual'
	>;

function pickByNames<Names extends string>(names: ReadonlyArray<Names>) {
	return function pick<Properties extends object>(properties: Properties) {
		const picked: Record<string, unknown> = {};

		for (const name of names) {
			const value = (properties as Record<string, unknown>)[name];

			if (value !== undefined) picked[name] = value;
		}

		return picked as Pick<Properties, Extract<keyof Properties, Names>>;
	};
}

export const pickMapSourceProperties = pickByNames(keysOf(sourceCodec.keys));
export const pickMapPopupProperties = pickByNames(keysOf(popupCodec.keys));

export function encodeMapPopupData(
	items: ReadonlyArray<MapPopupItem>,
): Array<MapPopupItemCompressed> {
	return items.map((item) => z.encode(MapPopupItemSchema, item));
}

export function encodeMapSourceData(
	items: ReadonlyArray<MapSourceItem>,
): Array<MapSourceItemCompressed> {
	return items.map((item) => z.encode(MapSourceItemSchema, item));
}
