import { GeometryTypeEnum } from '@spectralcodex/shared/map';
import { z } from 'zod';

import type { MapCodecTable } from '#codec-fields.ts';

import { decodeFields, encodeFields } from '#codec-fields.ts';
import { geometryKey, mapSourceKeys, popupFields, sourceFields } from '#codec-tables.ts';
import { LocationStatusNumericMapping } from '#map-codes.ts';
import { decodeMapRowId, encodeMapRowId, getMapRowUrl } from '#map-ids.ts';

interface FieldSchemas {
	compressed: z.ZodType;
	standard: z.ZodType;
}

type CompressedShape<
	Fields extends MapCodecTable,
	Schemas extends Record<keyof Fields, FieldSchemas>,
> = {
	[Name in keyof Fields as Fields[Name]['key']]: Schemas[Name]['compressed'];
};

type StandardShape<Schemas extends Record<string, FieldSchemas>> = {
	[Name in keyof Schemas]: Schemas[Name]['standard'];
};

function same<Schema extends z.ZodType>(schema: Schema) {
	return { compressed: schema, standard: schema };
}

function withDefault<Schema extends z.ZodType>(schema: Schema) {
	return { compressed: schema.optional(), standard: schema };
}

function codedEnum<Value extends string>(codes: Readonly<Record<Value, number>>) {
	const values = Object.keys(codes) as [Value, ...Array<Value>];

	return { compressed: z.enum(codes), standard: z.enum(values) };
}

export function createFieldCodec<
	Fields extends MapCodecTable,
	Schemas extends Record<keyof Fields, FieldSchemas>,
>(fields: Fields, schemas: Schemas) {
	const namesByKey = new Map<string, string>();

	for (const [name, { key }] of Object.entries(fields)) {
		const taken = namesByKey.get(key);

		if (taken) throw new Error(`[Map codec] "${name}" reuses the key "${key}" of "${taken}"`);

		namesByKey.set(key, name);
	}

	const compressedShape = Object.fromEntries(
		Object.entries(fields).map(([name, { key }]) => [key, schemas[name]?.compressed]),
	) as CompressedShape<Fields, Schemas>;
	const standardShape = Object.fromEntries(
		Object.entries(schemas).map(([name, { standard }]) => [name, standard]),
	) as StandardShape<Schemas>;

	type Compressed = z.output<z.ZodObject<CompressedShape<Fields, Schemas>>>;
	type Standard = z.output<z.ZodObject<StandardShape<Schemas>>>;

	return {
		compressedShape,
		decode: (data: Compressed) => decodeFields(fields, data) as Standard,
		encode: (data: Standard) => encodeFields(fields, data) as Compressed,
		standardShape,
	};
}

const MapPositionSchema = z.tuple([z.number(), z.number()]);

const geometryCodec = z.codec(
	MapPositionSchema,
	z.object({ coordinates: MapPositionSchema, type: z.literal(GeometryTypeEnum.Point) }),
	{
		decode: (coordinates) => ({ coordinates, type: GeometryTypeEnum.Point }),
		encode: ({ coordinates }) => coordinates,
	},
);

const sourceCodec = createFieldCodec(sourceFields, {
	chunkKey: same(z.string().optional()),
	entryQuality: withDefault(z.number().int()),
	hasImage: withDefault(z.boolean()),
	id: same(z.string()),
	objective: same(z.number().int().optional()),
	outlier: same(z.boolean().optional()),
	pointTitle: same(z.string().optional()),
	precision: same(z.number().int()),
	rating: same(z.number().int()),
	regionOrdinals: same(z.number().int().array().optional()),
	status: codedEnum(LocationStatusNumericMapping),
	themeIndices: same(z.number().int().array().optional()),
	title: same(z.string()),
	titleMultilingual: same(z.string().optional()),
} satisfies Record<keyof typeof sourceFields, FieldSchemas>);

const popupCodec = createFieldCodec(popupFields, {
	description: same(z.string().optional()),
	googleMapsUrl: same(z.string().optional()),
	id: same(z.string()),
	image: {
		compressed: z.string().optional(),
		standard: z.object({ srcSet: z.string() }).optional(),
	},
	own: same(z.number().int().optional()),
	ownTitle: same(z.string().optional()),
	ownTitleMultilingualLang: same(z.string().optional()),
	ownTitleMultilingualValue: same(z.string().optional()),
	title: same(z.string()),
	titleMultilingualLang: same(z.string().optional()),
	titleMultilingualValue: same(z.string().optional()),
	wikipediaUrl: same(z.string().optional()),
} satisfies Record<keyof typeof popupFields, FieldSchemas>);

export const MapSourceItemSchema = z.codec(
	z.object({ ...sourceCodec.compressedShape, [geometryKey]: geometryCodec.in }).strict(),
	z.object({
		geometry: geometryCodec.out,
		properties: z.object({ ...sourceCodec.standardShape, url: z.string().optional() }),
		type: z.literal('Feature'),
	}),
	{
		decode: (data) => {
			const properties = sourceCodec.decode(data);
			const id = decodeMapRowId(properties.id, properties.title);

			return {
				geometry: z.decode(geometryCodec, data[geometryKey]),
				properties: { ...properties, id, url: getMapRowUrl(id) },
				type: 'Feature' as const,
			};
		},
		encode: ({ geometry, properties }) => ({
			...sourceCodec.encode(properties),
			[geometryKey]: z.encode(geometryCodec, geometry),
			[mapSourceKeys.id]: encodeMapRowId(properties.id, properties.title),
		}),
	},
);

const mapDirectoryColumnKeys = Object.values(mapSourceKeys);

export const MapDirectorySchema = z.codec(
	z
		.partialRecord(z.enum(mapDirectoryColumnKeys), z.array(z.unknown()))
		.refine((columns) => new Set(Object.values(columns).map((column) => column.length)).size <= 1, {
			message: 'Every directory column must hold one value per row',
		}),
	z.array(MapSourceItemSchema),
	{
		decode: (columns) => {
			const rowCount = Object.values(columns).at(0)?.length ?? 0;

			return Array.from({ length: rowCount }, (_, index) => {
				const row: Record<string, unknown> = {};

				for (const [key, column] of Object.entries(columns)) {
					const value = column[index] ?? undefined;

					if (value !== undefined) row[key] = value;
				}

				return row as MapSourceItemCompressed;
			});
		},
		encode: (rows) => {
			const columns: Partial<Record<(typeof mapDirectoryColumnKeys)[number], Array<unknown>>> = {};

			for (const key of mapDirectoryColumnKeys) {
				const column = rows.map((row) => row[key]);

				if (column.some((value) => value !== undefined)) columns[key] = column;
			}

			return columns;
		},
	},
);

export const MapPopupItemSchema = z.codec(
	z.object(popupCodec.compressedShape).strict(),
	z.object(popupCodec.standardShape),
	{ decode: popupCodec.decode, encode: popupCodec.encode },
);

export type MapDirectoryColumns = z.input<typeof MapDirectorySchema>;

export type MapPopupItem = z.output<typeof MapPopupItemSchema>;
export type MapPopupItemCompressed = z.input<typeof MapPopupItemSchema>;

export type MapSourceItem = z.output<typeof MapSourceItemSchema>;
export type MapSourceItemCompressed = z.input<typeof MapSourceItemSchema>;

export type MapFeatureProperties = Omit<MapPopupItem, 'id'> &
	Omit<
		MapSourceItem['properties'],
		'chunkKey' | 'hasImage' | 'id' | 'regionOrdinals' | 'themeIndices' | 'titleMultilingual'
	>;

export function encodeMapPopupData(
	items: ReadonlyArray<MapPopupItem>,
): Array<MapPopupItemCompressed> {
	return items.map((item) => z.encode(MapPopupItemSchema, item));
}

export function encodeMapDirectory(items: Array<MapSourceItem>) {
	return z.encode(MapDirectorySchema, items);
}
