import {
	openGraphImageFormat,
	openGraphImageHeight,
	openGraphImageWidth,
	openGraphManifestFile,
} from '@spectralcodex/shared/constants';
import { createHash } from 'node:crypto';
import { existsSync, promises as fs, readFileSync } from 'node:fs';
import path from 'node:path';

// Everything that decides a card's pixels; hashed so a template edit can never be forgotten
const templateFiles = ['element.tsx', 'fonts.ts', 'generate.ts'];

const templateVersion = hashTemplateFiles();

// A stable `{id}.jpg` filename keeps the public URL fixed, so freshness lives in a manifest instead
export async function createOutputCache(directory: string) {
	const manifestPath = path.join(directory, openGraphManifestFile);

	const keys = new Map<string, string>(
		existsSync(manifestPath)
			? Object.entries(
					JSON.parse(await fs.readFile(manifestPath, 'utf8')) as Record<string, string>,
				)
			: [],
	);

	function filePath(id: string): string {
		return path.join(directory, `${id}.${openGraphImageFormat}`);
	}

	return {
		// The file is checked too, so a cleared output directory never reads as fresh
		isFresh(id: string, key: string): boolean {
			return keys.get(id) === key && existsSync(filePath(id));
		},

		// A card outlives the entry that asked for it; built HTML is the authority on what should exist
		// An empty set means a stale or missing `dist/`, which must not read as "delete everything"
		async prune(ids: Set<string>): Promise<number> {
			if (ids.size === 0) return 0;

			const suffix = `.${openGraphImageFormat}`;
			const files = await fs.readdir(directory);
			let removed = 0;

			for (const file of files) {
				if (!file.endsWith(suffix) || ids.has(file.slice(0, -suffix.length))) continue;

				await fs.rm(path.join(directory, file));
				removed++;
			}

			for (const id of keys.keys()) {
				if (!ids.has(id)) keys.delete(id);
			}

			return removed;
		},

		async save(): Promise<void> {
			const sorted = [...keys].sort(([first], [second]) => first.localeCompare(second));

			await fs.writeFile(
				manifestPath,
				`${JSON.stringify(Object.fromEntries(sorted), undefined, 2)}\n`,
			);
		},

		async write(id: string, key: string, data: Uint8Array): Promise<void> {
			const target = filePath(id);

			if (await hasChanged(target, data)) await fs.writeFile(target, data);

			keys.set(id, key);
		},
	};
}

// A card goes stale when its content, its source image, or the template changes
export function getOutputCacheKey({
	digest,
	imageId,
	imageModifiedTime,
}: {
	digest: string;
	imageId: string;
	imageModifiedTime: number | undefined;
}): string {
	return [templateVersion, digest, imageId, imageModifiedTime ?? ''].join(':');
}

// A template edit restages every card, but the render is deterministic and most come out identical;
// rewriting those bytes only churns the mtime the deploy syncs on
async function hasChanged(target: string, data: Uint8Array): Promise<boolean> {
	try {
		const existing = await fs.readFile(target);

		return !existing.equals(data);
	} catch {
		return true;
	}
}

function hashTemplateFiles(): string {
	const hash = createHash('sha256').update(
		`${String(openGraphImageWidth)}x${String(openGraphImageHeight)}`,
	);

	for (const file of templateFiles) {
		hash.update(readFileSync(new URL(file, import.meta.url), 'utf8'));
	}

	return hash.digest('hex').slice(0, 8);
}
