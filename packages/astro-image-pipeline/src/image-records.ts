import { promises as fs } from 'node:fs';
import path from 'node:path';

import { formatList } from '#format.ts';

interface ImageRecord {
	name: string;
	sourcePath: string;
}

async function listRecordFiles(recordsPath: string) {
	try {
		const entries = await fs.readdir(recordsPath);

		return entries
			.filter((entry) => entry.endsWith('.ndjson'))
			.toSorted((first, second) => first.localeCompare(second));
	} catch {
		return [];
	}
}

export async function resetImageRecords(recordsPath: string) {
	await fs.rm(recordsPath, { force: true, recursive: true });
	await fs.mkdir(recordsPath, { recursive: true });
}

export async function readImageRecords(recordsPath: string) {
	const files = new Map<string, string>();
	const conflicts = new Set<string>();

	const recordFiles = await listRecordFiles(recordsPath);

	for (const recordFile of recordFiles) {
		const text = await fs.readFile(path.join(recordsPath, recordFile), 'utf8');

		for (const line of text.split('\n')) {
			if (line === '') continue;

			const { name, sourcePath } = JSON.parse(line) as ImageRecord;
			const recorded = files.get(name);

			if (recorded === undefined) {
				files.set(name, sourcePath);
			} else if (recorded !== sourcePath) {
				conflicts.add(`${name} (${recorded}, ${sourcePath})`);
			}
		}
	}

	if (conflicts.size > 0) {
		throw new Error(
			`${String(conflicts.size)} image names were recorded from more than one source:\n${formatList([...conflicts].toSorted((first, second) => first.localeCompare(second)))}`,
		);
	}

	return new Map([...files].toSorted(([first], [second]) => first.localeCompare(second)));
}
