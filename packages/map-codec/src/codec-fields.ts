import { z } from 'zod';

interface MapCodecField<
	Key extends string,
	Compressed extends z.ZodType,
	Standard extends z.ZodType,
> {
	compressed: Compressed;
	decode: (value: z.output<Compressed>) => z.output<Standard>;
	encode: (value: z.output<Standard>) => z.output<Compressed>;
	key: Key;
	standard: Standard;
}

// Typing the parameters as `never` lets one table hold fields of any value type
interface MapCodecFieldLike {
	compressed: z.ZodType;
	decode: (value: never) => unknown;
	encode: (value: never) => unknown;
	key: string;
	standard: z.ZodType;
}

type MapCodecTable = Record<string, MapCodecFieldLike>;

type CompressedShape<Table extends MapCodecTable> = {
	[Name in keyof Table as Table[Name]['key']]: Table[Name]['compressed'];
};

type StandardShape<Table extends MapCodecTable> = {
	[Name in keyof Table]: Table[Name]['standard'];
};

export function keysOf<Table extends object>(table: Table) {
	return Object.keys(table) as Array<keyof Table & string>;
}

export function field<Key extends string, Compressed extends z.ZodType, Standard extends z.ZodType>(
	key: Key,
	definition: Omit<MapCodecField<Key, Compressed, Standard>, 'key'>,
): MapCodecField<Key, Compressed, Standard> {
	return { ...definition, key };
}

export function plain<Key extends string, Schema extends z.ZodType>(key: Key, schema: Schema) {
	return field(key, {
		compressed: schema,
		decode: (value) => value,
		encode: (value) => value,
		standard: schema,
	});
}

export function withFallback<Key extends string, Schema extends z.ZodType>(
	key: Key,
	schema: Schema,
	fallback: z.output<Schema>,
) {
	return field(key, {
		compressed: schema.optional(),
		decode: (value) => value ?? fallback,
		encode: (value) => (value === fallback ? undefined : value),
		standard: schema,
	});
}

export function coded<Key extends string, Value extends string>(
	key: Key,
	codes: Readonly<Record<Value, number>>,
	fallback: NoInfer<Value>,
) {
	const values = Object.keys(codes) as [Value, ...Array<Value>];
	const valueByCode = new Map(values.map((value) => [codes[value], value]));

	return field(key, {
		compressed: z.enum(codes),
		decode: (code) => valueByCode.get(code) ?? fallback,
		encode: (value) => codes[value],
		standard: z.enum(values),
	});
}

export function createFieldCodec<Table extends MapCodecTable>(table: Table) {
	const entries = Object.entries(table);
	const namesByKey = new Map<string, string>();

	for (const [name, { key }] of entries) {
		const taken = namesByKey.get(key);

		if (taken) throw new Error(`[Map codec] "${name}" reuses the key "${key}" of "${taken}"`);

		namesByKey.set(key, name);
	}

	const compressedShape = Object.fromEntries(
		entries.map(([, { compressed, key }]) => [key, compressed]),
	) as CompressedShape<Table>;
	const standardShape = Object.fromEntries(
		entries.map(([name, { standard }]) => [name, standard]),
	) as StandardShape<Table>;
	const keys = Object.fromEntries(entries.map(([name, { key }]) => [name, key])) as {
		[Name in keyof Table]: Table[Name]['key'];
	};

	type Compressed = z.output<z.ZodObject<CompressedShape<Table>>>;
	type Standard = z.output<z.ZodObject<StandardShape<Table>>>;

	function decode(data: Compressed) {
		const standard: Record<string, unknown> = {};

		for (const [name, { decode: decodeValue, key }] of entries) {
			const value = (decodeValue as (value: unknown) => unknown)(data[key as keyof Compressed]);

			if (value !== undefined) standard[name] = value;
		}

		return standard as Standard;
	}

	function encode(data: Standard) {
		const compressed: Record<string, unknown> = {};

		for (const [name, { encode: encodeValue, key }] of entries) {
			const value = (encodeValue as (value: unknown) => unknown)(data[name as keyof Standard]);

			if (value !== undefined) compressed[key] = value;
		}

		return compressed as Compressed;
	}

	return {
		compressedShape,
		decode,
		encode,
		keys,
		standardShape,
	};
}
