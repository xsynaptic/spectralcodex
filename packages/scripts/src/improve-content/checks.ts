import type { DataStoreEntry } from '../shared/data-store';

interface CheckOptions {
	threshold: number;
}

export type CheckFn = (
	entries: Array<DataStoreEntry>,
	options: CheckOptions,
) => Array<DataStoreEntry>;

function findStubs(
	entries: Array<DataStoreEntry>,
	{ threshold }: CheckOptions,
): Array<DataStoreEntry> {
	return entries.filter((entry) => {
		const body = entry.body ?? '';

		return body.trim().length < threshold;
	});
}

export const checks: Record<string, CheckFn> = {
	'find-stubs': findStubs,
};
