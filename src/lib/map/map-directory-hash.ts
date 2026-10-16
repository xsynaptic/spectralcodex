import { hash } from 'ohash';

import { hashShortLength } from '#constants.ts';

export function hashMapPayloads(payloads: ReadonlyMap<string, string>): string {
	return hash(
		[...payloads].toSorted(([firstId], [secondId]) => firstId.localeCompare(secondId)),
	).slice(0, hashShortLength);
}
