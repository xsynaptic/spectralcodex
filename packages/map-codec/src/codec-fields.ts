interface MapCodecField<Key extends string, Compressed, Standard> {
	decode: (value: Compressed) => Standard;
	encode: (value: Standard) => Compressed;
	key: Key;
}

// Typing the parameters as `never` lets one table hold fields of any value type
interface MapCodecFieldLike {
	decode: (value: never) => unknown;
	encode: (value: never) => unknown;
	key: string;
}

export type MapCodecTable = Record<string, MapCodecFieldLike>;

type ValueCodec = (value: unknown) => unknown;

export function keysOf<Table extends object>(table: Table) {
	return Object.keys(table) as Array<keyof Table & string>;
}

export function getFieldKeys<Table extends MapCodecTable>(table: Table) {
	return Object.fromEntries(Object.entries(table).map(([name, { key }]) => [name, key])) as {
		[Name in keyof Table]: Table[Name]['key'];
	};
}

export function field<Key extends string, Compressed, Standard>(
	key: Key,
	definition: Omit<MapCodecField<Key, Compressed, Standard>, 'key'>,
): MapCodecField<Key, Compressed, Standard> {
	return { ...definition, key };
}

export function plain<Key extends string>(key: Key) {
	return field(key, {
		decode: (value: unknown) => value,
		encode: (value: unknown) => value,
	});
}

export function withFallback<Key extends string, Value>(key: Key, fallback: Value) {
	return field(key, {
		decode: (value: undefined | Value) => value ?? fallback,
		encode: (value: Value) => (value === fallback ? undefined : value),
	});
}

export function coded<Key extends string, Value extends string>(
	key: Key,
	codes: Readonly<Record<Value, number>>,
	fallback: NoInfer<Value>,
) {
	const valueByCode = new Map(keysOf(codes).map((value) => [codes[value], value]));

	return field(key, {
		decode: (code: number) => valueByCode.get(code) ?? fallback,
		encode: (value: Value) => codes[value],
	});
}

export function decodeFields(table: MapCodecTable, data: object) {
	const compressed = data as Record<string, unknown>;
	const standard: Record<string, unknown> = {};

	for (const [name, { decode, key }] of Object.entries(table)) {
		const value = (decode as ValueCodec)(compressed[key]);

		if (value !== undefined) standard[name] = value;
	}

	return standard;
}

export function encodeFields(table: MapCodecTable, data: object) {
	const standard = data as Record<string, unknown>;
	const compressed: Record<string, unknown> = {};

	for (const [name, { encode, key }] of Object.entries(table)) {
		const value = (encode as ValueCodec)(standard[name]);

		if (value !== undefined) compressed[key] = value;
	}

	return compressed;
}
