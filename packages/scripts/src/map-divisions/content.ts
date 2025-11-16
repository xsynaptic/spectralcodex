import type { GeometryBoundingBox } from '@spectralcodex/map-types';

import { parseFrontmatter } from '@astrojs/markdown-remark';
import { GeometryBoundingBoxSchema, GeometryDivisionIdSchema } from '@spectralcodex/map-types';
import chalk from 'chalk';
import fs from 'node:fs/promises';
import path from 'node:path';

import type { RegionMetadata } from './types';

/**
 * Load frontmatter from the regions collection
 */
export async function parseRegionData(rootPath: string, regionsPath: string) {
	console.log(chalk.blue('Scanning regions collection for divisionId in frontmatter...'));

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

					// Determine all ancestor IDs from path structure
					const regionPathIds: Array<string> = [];

					if (parentPath) {
						const pathParts = parentPath.split('/');
						// Add all path parts from most specific to least specific
						for (let i = pathParts.length; i > 0; i--) {
							if (pathParts[i - 1]) regionPathIds.push(pathParts[i - 1]!);
						}
					}
					regionPathIds.push(slug);

					const divisionSelectionBBox = GeometryBoundingBoxSchema.optional().parse(
						frontmatter.divisionSelectionBBox,
					);
					const divisionClippingBBox = GeometryBoundingBoxSchema.optional().parse(
						frontmatter.divisionClippingBBox,
					);

					const divisionIdValue = GeometryDivisionIdSchema.optional().parse(frontmatter.divisionId);

					let divisionIds: Array<string> = [];

					if (divisionIdValue) {
						divisionIds = Array.isArray(divisionIdValue)
							? divisionIdValue.filter((id): id is string => typeof id === 'string')
							: [divisionIdValue].filter((id): id is string => typeof id === 'string');
					}

					regions.push({
						slug,
						divisionIds,
						regionPathIds,
						...(divisionSelectionBBox ? { divisionSelectionBBox } : {}),
						...(divisionClippingBBox ? { divisionClippingBBox } : {}),
					});
				} catch (error) {
					console.warn(
						chalk.yellow(`Failed to parse frontmatter for ${chalk.cyan(filePath)}:`),
						error,
					);
				}
			}
		}
	}

	try {
		const regionsDir = path.join(rootPath, regionsPath);

		await scanDirectory(regionsDir);

		const regionsWithDivisionIds = regions.filter((r) => r.divisionIds.length > 0);

		console.log(
			chalk.green(
				`Found ${chalk.cyan(String(regionsWithDivisionIds.length))} regions with division IDs (${chalk.cyan(String(regions.length))} total regions scanned)`,
			),
		);

		return { allRegions: regions, regionsWithDivisionIds };
	} catch (error) {
		console.error(chalk.red(`Failed to scan regions directory ${chalk.cyan(regionsPath)}:`), error);

		throw new Error(`Failed to scan regions directory ${regionsPath}`);
	}
}

/**
 * Resolve a bounding box hierarchically by walking up the ancestry chain
 */
export function resolveBoundingBox(
	region: RegionMetadata,
	regionsBySlug: Map<string, RegionMetadata>,
	bboxField: 'divisionSelectionBBox' | 'divisionClippingBBox',
): GeometryBoundingBox | undefined {
	// Check if this region has its own bbox
	if (region[bboxField]) {
		return region[bboxField];
	}

	// Walk up ancestry chain (from most specific to least specific)
	for (const ancestorSlug of region.regionPathIds) {
		const ancestor = regionsBySlug.get(ancestorSlug);

		if (ancestor?.[bboxField]) return ancestor[bboxField];
	}

	return undefined;
}
