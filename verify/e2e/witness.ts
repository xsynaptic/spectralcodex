import { readFileSync } from 'node:fs';

const witnessRowPattern = /\[step \|-> "(\w+)",\s*seen \|-> \[([^\]]*)\]\]/g;
const witnessFieldPattern = /(\w+) \|-> ("[^"]*"|TRUE|FALSE)/g;

interface WitnessRow {
	seen: Record<string, boolean | string>;
	step: string;
}

function readTlaValue(value: string) {
	if (value === 'TRUE') return true;
	if (value === 'FALSE') return false;

	return value.slice(1, -1);
}

export function readWitnessPath(witnessFile: string) {
	const text = readFileSync(witnessFile, 'utf8');
	const witnessPath: Array<WitnessRow> = [];

	for (const [, step = '', fields = ''] of text.matchAll(witnessRowPattern)) {
		const seen: Record<string, boolean | string> = {};

		for (const [, key = '', value = ''] of fields.matchAll(witnessFieldPattern)) {
			seen[key] = readTlaValue(value);
		}

		witnessPath.push({ seen, step });
	}

	return witnessPath;
}
