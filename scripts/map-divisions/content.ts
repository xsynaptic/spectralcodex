#!/usr/bin/env tsx

import { parseFrontmatter } from '@astrojs/markdown-remark';
import fs from 'node:fs/promises';
import path from 'node:path';

import type { RegionMetadata } from './types';

/**
 * Load frontmatter from the regions collection
 */
export async function parseRegionData(regionsPath: string) {
	console.log('Scanning regions collection for divisionId in frontmatter...');

	const regions: Array<RegionMetadata> = [];

	async function scanDirectory(dir: string, parentPath = ''): Promise<void> {
		const entries = await fs.readdir(dir, { withFileTypes: true });

		for (const entry of entries) {
			if (entry.isDirectory()) {
				const dirPath = path.join(dir, entry.name);
				const newParentPath = parentPath ? `${parentPath}/${entry.name}` : entry.name;

				await scanDirectory(dirPath, newParentPath);
			} else if (entry.name.endsWith('.mdx')) {
				const filePath = path.join(dir, entry.name);
				const slug = entry.name.replace('.mdx', '');

				try {
					const fileContent = await fs.readFile(filePath, 'utf8');
					const { frontmatter } = parseFrontmatter(fileContent);

					if (frontmatter.divisionId) {
						// Handle divisionId as string or array (used for composite regions)
						const divisionIdValue = frontmatter.divisionId as string | Array<string>;
						const divisionIds = Array.isArray(divisionIdValue)
							? divisionIdValue.filter((id): id is string => typeof id === 'string')
							: [divisionIdValue].filter((id): id is string => typeof id === 'string');

						if (divisionIds.length > 0) {
							// Determine ancestor ID from path structure
							const regionAncestorId = parentPath ? parentPath.split('/')[0]! : slug;

							regions.push({
								slug,
								divisionIds,
								regionAncestorId,
							});
						}
					}
				} catch (error) {
					console.warn(`Failed to parse frontmatter for ${filePath}:`, error);
				}
			}
		}
	}

	try {
		const regionsDir = path.join(process.cwd(), regionsPath);

		await scanDirectory(regionsDir);

		console.log(`Found ${String(regions.length)} regions with division IDs`);

		return regions;
	} catch (error) {
		console.error(`Failed to scan regions directory ${regionsPath}:`, error);

		throw new Error(`Failed to scan regions directory ${regionsPath}`);
	}
}
