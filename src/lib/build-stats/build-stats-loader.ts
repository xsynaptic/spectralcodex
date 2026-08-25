import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';

const BuildRecordSchema = z.object({
	timestamp: z.iso.datetime(),
	durationSeconds: z.number().positive(),
	notes: z.string().optional(),
	pageCount: z.number().int().nonnegative().optional(),
});

export type BuildRecord = z.infer<typeof BuildRecordSchema>;

// Gitignored operational log; a fresh clone has no file and must still build
const buildLogPath = path.join(process.cwd(), 'astro-build.jsonl');

export async function getBuildRecords(): Promise<Array<BuildRecord>> {
	let fileContents: string;

	try {
		fileContents = await readFile(buildLogPath, 'utf8');
	} catch {
		console.warn(`[Build stats] Not found: ${buildLogPath} (the page renders an empty state)`);
		return [];
	}

	const records: Array<BuildRecord> = [];

	for (const line of fileContents.split('\n')) {
		if (line.trim() === '') continue;

		try {
			const result = BuildRecordSchema.safeParse(JSON.parse(line));

			if (result.success) records.push(result.data);
		} catch {
			continue;
		}
	}

	records.sort((recordA, recordB) => recordA.timestamp.localeCompare(recordB.timestamp));

	return records;
}
