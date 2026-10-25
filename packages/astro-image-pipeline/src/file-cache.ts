import { existsSync, promises as fs } from 'node:fs';
import path from 'node:path';

import { readFileIfExists, readJsonFile, writeJsonFile } from '#files.ts';
import { Refusal } from '#refusal.ts';

const sidecarFile = 'sidecar.json';

interface FileCacheRecord {
	key: string;
}

interface FileCacheSidecar {
	derivatives: Record<string, FileCacheRecord>;
}

function formatCount(count: number) {
	return count.toLocaleString('en-CA');
}

// Deleting more files than this usually means the manifest or media folder is wrong
function getMassPruneLimit(fileCount: number) {
	return Math.max(100, Math.ceil(fileCount / 50));
}

export function assertPruneLimit({
	count,
	isAllowed,
	subject,
	total,
}: {
	count: number;
	isAllowed: boolean;
	subject: string;
	total: number;
}) {
	const limit = getMassPruneLimit(total);

	if (isAllowed || count <= limit) return;

	throw new Refusal(
		`Refusing to prune ${formatCount(count)} of ${formatCount(total)} ${subject} (limit ${formatCount(limit)}); allow a mass prune if the removal is intended`,
	);
}

async function readDirectory(directory: string) {
	try {
		return await fs.readdir(directory, { recursive: true });
	} catch {
		return [];
	}
}

export async function listFileCacheFiles(directory: string, extensions: ReadonlyArray<string>) {
	const names = await readDirectory(directory);

	return names
		.map((name) => name.split(path.sep).join('/'))
		.filter(
			(name) =>
				extensions.some((extension) => name.endsWith(`.${extension}`)) || name.endsWith('.tmp'),
		)
		.toSorted((first, second) => first.localeCompare(second));
}

export async function createFileCache({
	directory,
	extensions,
	onReplace,
	statePath,
}: {
	directory: string;
	extensions: ReadonlyArray<string>;
	onReplace?: (name: string) => Promise<void>;
	statePath: string;
}) {
	const sidecarPath = path.join(statePath, sidecarFile);
	const sidecar = await readJsonFile<FileCacheSidecar>(sidecarPath);
	const records = new Map(Object.entries(sidecar?.derivatives ?? {}));

	function filePath(name: string) {
		return path.join(directory, name);
	}

	return {
		filePath,

		isFresh(name: string, key: string) {
			return records.get(name)?.key === key && existsSync(filePath(name));
		},

		async planPrune(keep: ReadonlySet<string>, { isMassPruneAllowed = false } = {}) {
			const files = await listFileCacheFiles(directory, extensions);

			if (keep.size === 0 && files.length > 0) {
				throw new Refusal(`Refusing to prune ${directory}: nothing references it; build first`);
			}

			const orphans = files.filter((name) => !keep.has(name));

			assertPruneLimit({
				count: orphans.length,
				isAllowed: isMassPruneAllowed,
				subject: `files in ${directory}`,
				total: files.length,
			});

			return {
				async apply() {
					for (const name of orphans) await fs.rm(filePath(name), { force: true });

					for (const name of records.keys()) {
						if (!keep.has(name)) records.delete(name);
					}
				},
				orphans,
			};
		},

		async save() {
			await writeJsonFile(sidecarPath, {
				derivatives: Object.fromEntries(
					[...records].toSorted(([first], [second]) => first.localeCompare(second)),
				),
			} satisfies FileCacheSidecar);
		},

		// Unchanged bytes leave the file alone, because the deploy uploads files whose modified time changed
		async write(name: string, key: string, data: Uint8Array) {
			const target = filePath(name);
			const existing = await readFileIfExists(target);
			const isChanged = !existing?.equals(data);

			if (isChanged) {
				const temporary = `${target}.tmp`;

				await fs.mkdir(path.dirname(target), { recursive: true });
				await fs.writeFile(temporary, data);
				if (existing) await onReplace?.(name);
				await fs.rename(temporary, target);
			}

			records.set(name, { key });

			return isChanged;
		},
	};
}
