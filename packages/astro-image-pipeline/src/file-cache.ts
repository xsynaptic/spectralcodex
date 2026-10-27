import { existsSync, promises as fs } from 'node:fs';
import path from 'node:path';

import { readFileIfExists, readJsonFile, writeJsonFile } from '#files.ts';

interface FileCacheRecord {
	key: string;
}

// Renaming `files` would orphan every recorded key and re-render the whole library
interface RenderKeys {
	files: Record<string, FileCacheRecord>;
}

export async function createFileCache({
	directory,
	onReplace,
}: {
	directory: string;
	onReplace?: (name: string) => Promise<void>;
}) {
	const keysPath = `${directory}-keys.json`;
	const stored = await readJsonFile<RenderKeys>(keysPath);
	const records = new Map(Object.entries(stored?.files ?? {}));

	function filePath(name: string) {
		return path.join(directory, name);
	}

	return {
		isFresh(name: string, key: string) {
			return records.get(name)?.key === key && existsSync(filePath(name));
		},

		async save() {
			await writeJsonFile(keysPath, {
				files: Object.fromEntries(
					[...records].toSorted(([first], [second]) => first.localeCompare(second)),
				),
			} satisfies RenderKeys);
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
