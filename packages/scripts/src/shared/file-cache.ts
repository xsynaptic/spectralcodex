import { existsSync, promises as fs } from 'node:fs';
import path from 'node:path';

import { Refusal } from '#shared/cli-command.ts';
import { readFileIfExists, readJsonFile, sortRecord, writeJsonFile } from '#shared/utils.ts';

const sidecarFile = 'sidecar.json';

interface FileCacheRecord {
	key: string;
}

interface FileCacheSidecar {
	derivatives: Record<string, FileCacheRecord>;
}

// Above this many removals a wrong manifest or media root is likelier than a real cleanup
export function getMassPruneLimit(fileCount: number) {
	return Math.max(100, Math.ceil(fileCount / 50));
}

async function readDirectory(directory: string) {
	try {
		return await fs.readdir(directory, { recursive: true });
	} catch {
		return [];
	}
}

// Leftover temp files are listed too, so a prune sweeps up after an interrupted run
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
			const limit = getMassPruneLimit(files.length);

			if (!isMassPruneAllowed && orphans.length > limit) {
				throw new Refusal(
					`Refusing to prune ${String(orphans.length)} of ${String(files.length)} files in ${directory} (limit ${String(limit)}); pass --allow-mass-prune if the build is right`,
				);
			}

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
				derivatives: sortRecord(records),
			} satisfies FileCacheSidecar);
		},

		// Identical bytes keep their mtime, which is what the deploy syncs on
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
