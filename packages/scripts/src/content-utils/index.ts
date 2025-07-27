#!/usr/bin/env tsx
import { parseFrontmatter } from '@astrojs/markdown-remark';
import { readdirSync, statSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';

export interface ContentCollectionFileMetadata {
	id: string;
	filename: string;
	extension: string;
	filePath: string;
	relativePath: string;
	hierarchy: Array<string>;
	frontmatter: Record<string, unknown>;
	content: string;
}

export async function parseContentCollectionFiles(
	basePath: string,
	options: {
		skipUnderscoreFiles?: boolean;
		recursive?: boolean;
	} = {},
) {
	const { skipUnderscoreFiles = true, recursive = true } = options;
	const contentMetadata: Array<ContentCollectionFileMetadata> = [];

	async function processDirectory(dirPath: string) {
		const filenames = readdirSync(dirPath);

		for (const filename of filenames) {
			const filePath = path.join(dirPath, filename);
			const stat = statSync(filePath);

			if (stat.isDirectory() && recursive) {
				await processDirectory(filePath);
			} else if (filename.endsWith('.md') || filename.endsWith('.mdx')) {
				if (skipUnderscoreFiles && filename.startsWith('_')) continue;

				try {
					const fileContent = await fs.readFile(filePath, 'utf8');
					const { frontmatter, content } = parseFrontmatter(fileContent);

					const extension = path.extname(filename);
					const relativePath = path.relative(basePath, filePath);

					contentMetadata.push({
						id: filename.replace(extension, ''),
						filename,
						extension: extension.replace('.', ''),
						filePath,
						relativePath,
						hierarchy: relativePath.replace(extension, '').split('/'),
						frontmatter,
						content,
					});
				} catch (error) {
					console.warn(`Warning: Could not parse ${filePath}:`, error);
				}
			}
		}
	}

	await processDirectory(basePath);

	return contentMetadata;
}
