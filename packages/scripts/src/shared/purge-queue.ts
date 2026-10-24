import { promises as fs } from 'node:fs';
import path from 'node:path';

import { readFileIfExists } from '#shared/utils.ts';

const purgeQueueFile = 'purge-queue.txt';

// Appended before each overwrite lands, so a run killed after the rename still leaves the purge queued
export async function createPurgeQueue(statePath: string) {
	const filePath = path.join(statePath, purgeQueueFile);
	const data = await readFileIfExists(filePath);
	const queued = new Set(data?.toString('utf8').split('\n').filter(Boolean));

	return {
		async add(name: string) {
			if (queued.has(name)) return;

			queued.add(name);
			await fs.mkdir(statePath, { recursive: true });
			await fs.appendFile(filePath, `${name}\n`);
		},
		queued,
		async remove(names: Iterable<string>) {
			for (const name of names) queued.delete(name);

			const temporary = `${filePath}.tmp`;

			await fs.writeFile(temporary, [...queued].map((name) => `${name}\n`).join(''));
			await fs.rename(temporary, filePath);
		},
	};
}
