import { ImageFeaturedSchema } from '@spectralcodex/shared/schemas';
import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const imgRegex = /<Img(?:\s+([^>]*?))?(?:>|\/?>)/g;
const srcPropRegex = /src=["']([^"']+)["']/;

export function extractImageFeaturedIds(frontmatter: Record<string, unknown>): Array<string> {
	const imageFeatured = frontmatter.imageFeatured;

	if (!imageFeatured) return [];

	const parsed = ImageFeaturedSchema.safeParse(imageFeatured);

	if (!parsed.success) return [];

	const data = parsed.data;

	if (typeof data === 'string') return [data];

	return data.map((item) => (typeof item === 'string' ? item : item.id));
}

export function extractMdxImageIds(content: string): Array<string> {
	const ids: Array<string> = [];
	let match: RegExpExecArray | null;

	while ((match = imgRegex.exec(content)) !== null) {
		const props = match[1] || '';
		const srcMatch = srcPropRegex.exec(props);

		if (srcMatch?.[1]) {
			ids.push(srcMatch[1]);
		}
	}

	return ids;
}

export function collectMediaFiles(mediaPath: string): Set<string> {
	const files = new Set<string>();

	function processDirectory(dirPath: string, prefix = '') {
		const entries = readdirSync(dirPath);

		for (const entry of entries) {
			const fullPath = path.join(dirPath, entry);
			const relativePath = prefix ? `${prefix}/${entry}` : entry;
			const stat = statSync(fullPath);

			if (stat.isDirectory()) {
				processDirectory(fullPath, relativePath);
			} else if (/\.(jpe?g|png|webp|avif|gif)$/i.test(entry)) {
				files.add(relativePath);
			}
		}
	}

	processDirectory(mediaPath);

	return files;
}
