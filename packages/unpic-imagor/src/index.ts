import type { Operations } from 'unpic';

export interface ImagorOperations extends Operations {
	fit?: 'cover' | 'contain' | 'inside' | 'outside' | 'fill';
	smart?: boolean;
	filters?: ReadonlyArray<string>;
}

export interface ImagorOptions {
	baseURL?: string;
}

export function generate(
	src: string | URL,
	operations: ImagorOperations,
	options?: ImagorOptions,
): string {
	const segments: Array<string> = [];

	const width = toNumber(operations.width) ?? 0;
	const height = toNumber(operations.height) ?? 0;

	// @TODO implement full fit spec; `fill` and `outside` currently fall through to cover
	if (operations.fit === 'contain' || operations.fit === 'inside') segments.push('fit-in');

	if (width > 0 || height > 0) {
		segments.push(`${String(width)}x${String(height)}`);
	}

	if (operations.smart === true) segments.push('smart');

	const filters: Array<string> = [];

	if (operations.quality !== undefined) filters.push(`quality(${String(operations.quality)})`);
	if (operations.format !== undefined) filters.push(`format(${String(operations.format)})`);
	if (operations.filters) for (const filter of operations.filters) filters.push(filter);

	if (filters.length > 0) segments.push(`filters:${filters.join(':')}`);

	segments.push(normaliseSource(src, options?.baseURL));

	return segments.join('/');
}

export function transform(
	src: string | URL,
	operations: ImagorOperations,
	options?: ImagorOptions,
): string {
	return generate(src, operations, options);
}

export function extract(_url: string | URL): {
	src: string;
	operations: ImagorOperations;
	options: ImagorOptions;
} | null {
	// eslint-disable-next-line unicorn/no-null -- upstream convention
	return null;
}

function toNumber(value: string | number | undefined): number | undefined {
	if (value === undefined) return undefined;
	if (typeof value === 'number') return value;
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : undefined;
}

function normaliseSource(src: string | URL, baseURL?: string): string {
	const raw = typeof src === 'string' ? src : src.toString();
	const withoutBase = baseURL && raw.startsWith(baseURL) ? raw.slice(baseURL.length) : raw;
	return withoutBase.startsWith('/') ? withoutBase.slice(1) : withoutBase;
}
