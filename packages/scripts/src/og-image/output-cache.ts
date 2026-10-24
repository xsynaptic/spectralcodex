import {
	openGraphImageFormat,
	openGraphImageHeight,
	openGraphImageWidth,
} from '@spectralcodex/shared/open-graph';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { createFileCache } from '#shared/file-cache.ts';

// Everything that decides a card's pixels; hashed so a template edit can never be forgotten
const templateFiles = ['element.tsx', 'fonts.ts', 'generate.ts'];

const templateVersion = hashTemplateFiles();

export async function createOutputCache({
	directory,
	statePath,
}: {
	directory: string;
	statePath: string;
}) {
	const cache = await createFileCache({ directory, extensions: [openGraphImageFormat], statePath });

	return {
		isFresh(id: string, key: string) {
			return cache.isFresh(getFileName(id), key);
		},

		// A card outlives the entry that asked for it; built HTML is the authority on what should exist
		planPrune(ids: ReadonlySet<string>, options?: { isMassPruneAllowed?: boolean }) {
			return cache.planPrune(new Set([...ids].map((id) => getFileName(id))), options);
		},

		save() {
			return cache.save();
		},

		write(id: string, key: string, data: Uint8Array) {
			return cache.write(getFileName(id), key, data);
		},
	};
}

function getFileName(id: string) {
	return `${id}.${openGraphImageFormat}`;
}

// A card goes stale when its content, its source image, or the template changes
export function getOutputCacheKey({
	digest,
	imageDigest,
	imageId,
}: {
	digest: string;
	imageDigest: string | undefined;
	imageId: string;
}): string {
	return [templateVersion, digest, imageId, imageDigest ?? ''].join(':');
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
