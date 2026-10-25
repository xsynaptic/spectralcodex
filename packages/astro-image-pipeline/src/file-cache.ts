import { existsSync, promises as fs } from 'node:fs';
import path from 'node:path';

import { readFileIfExists, readJsonFile, writeJsonFile } from '#files.ts';

const sidecarFile = 'sidecar.json';

interface FileCacheRecord {
	key: string;
}

interface FileCacheSidecar {
	files: Record<string, FileCacheRecord>;
}

export async function createFileCache({
	directory,
	onReplace,
	statePath,
}: {
	directory: string;
	onReplace?: (name: string) => Promise<void>;
	statePath: string;
}) {
	const sidecarPath = path.join(statePath, sidecarFile);
	const sidecar = await readJsonFile<FileCacheSidecar>(sidecarPath);
	const records = new Map(Object.entries(sidecar?.files ?? {}));

	function filePath(name: string) {
		return path.join(directory, name);
	}

	return {
		isFresh(name: string, key: string) {
			return records.get(name)?.key === key && existsSync(filePath(name));
		},

		async save() {
			await writeJsonFile(sidecarPath, {
				files: Object.fromEntries(
					[...records].toSorted(([first], [second]) => first.localeCompare(second)),
				),
			} satisfies FileCacheSidecar);
		},

		// Identical bytes keep the old file and its mtime, so rsync has nothing to send
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
