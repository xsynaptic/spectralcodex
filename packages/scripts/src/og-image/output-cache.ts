import {
	openGraphImageFormat,
	openGraphImageHeight,
	openGraphImageWidth,
} from '@spectralcodex/shared/open-graph';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

// Everything that decides a card's pixels; hashed so a template edit can never be forgotten
const templateFiles = ['element.tsx', 'fonts.ts', 'generate.ts'];

const templateVersion = hashTemplateFiles();

export function getCardName(id: string) {
	return `${id}.${openGraphImageFormat}`;
}

export function getOutputCacheKey({
	digest,
	imageDigest,
	imageId,
}: {
	digest: string;
	imageDigest: string | undefined;
	imageId: string;
}) {
	return [templateVersion, digest, imageId, imageDigest ?? ''].join(':');
}

function hashTemplateFiles() {
	const hash = createHash('sha256').update(
		`${String(openGraphImageWidth)}x${String(openGraphImageHeight)}`,
	);

	for (const file of templateFiles) {
		hash.update(readFileSync(new URL(file, import.meta.url), 'utf8'));
	}

	return hash.digest('hex').slice(0, 8);
}
