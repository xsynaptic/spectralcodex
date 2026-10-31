import { hash } from 'ohash';

// Mirrors `hashShortLength` in src/constants.ts
const hashShortLength = 12;

export function hashMapPayloads(payloads: ReadonlyMap<string, string>): string {
	return hash(
		[...payloads].toSorted(([firstId], [secondId]) => firstId.localeCompare(secondId)),
	).slice(0, hashShortLength);
}
