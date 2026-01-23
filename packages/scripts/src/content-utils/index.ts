#!/usr/bin/env tsx
import { parseFrontmatter } from '@astrojs/markdown-remark';
import { createHash } from 'node:crypto';
import { readdirSync, statSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';

export interface ContentFileMetadata {
	id: string;
	filename: string;
	extension: string;
	pathAbsolute: string;
	pathRelative: string;
	collection: string;
	hierarchy: Array<string>;
	frontmatter: Record<string, unknown>;
	content: string;
	hash?: string | undefined;
}

export async function parseContentFiles(
	basePaths: string | Array<string>,
	options: {
		skipUnderscoreFiles?: boolean;
		isRecursive?: boolean;
		withHashes?: boolean;
	} = {},
) {
	const { skipUnderscoreFiles = true, isRecursive = true, withHashes = false } = options;

	const contentMetadata: Array<ContentFileMetadata> = [];

	const paths = Array.isArray(basePaths) ? basePaths : [basePaths];

	for (const basePath of paths) {
		const collection = basePath.split('/').pop() ?? '';

		async function processDirectory(dirPath: string) {
			const filenames = readdirSync(dirPath);

			for (const filename of filenames) {
				const pathAbsolute = path.join(dirPath, filename);
				const stat = statSync(pathAbsolute);

				if (stat.isDirectory() && isRecursive) {
					await processDirectory(pathAbsolute);
				} else if (filename.endsWith('.md') || filename.endsWith('.mdx')) {
					if (skipUnderscoreFiles && filename.startsWith('_')) continue;

					try {
						const fileContent = await fs.readFile(pathAbsolute, 'utf8');

						const { frontmatter, content } = parseFrontmatter(fileContent);

						const extension = path.extname(filename);
						const pathRelative = path.relative(basePath, pathAbsolute);

						const hash = withHashes
							? createHash('md5').update(JSON.stringify(fileContent)).digest('hex')
							: undefined;

						contentMetadata.push({
							id: filename.replace(extension, ''),
							filename,
							extension: extension.replace('.', ''),
							pathAbsolute,
							pathRelative,
							collection,
							hierarchy: pathRelative.replace(extension, '').split('/'),
							frontmatter,
							content,
							hash,
						});
					} catch (error) {
						console.warn(`Warning: Could not parse ${pathAbsolute}:`, error);
					}
				}
			}
		}

		await processDirectory(basePath);
	}

	return contentMetadata;
}
