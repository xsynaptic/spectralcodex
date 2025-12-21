#!/usr/bin/env tsx
import chalk from 'chalk';
import { z } from 'zod';

import { parseContentFiles } from '../content-utils';
import { ImageFeaturedSchema } from '../content-utils/collections';

export async function checkContentQuality(contentPaths: Array<string>) {
	let overallMismatchCount = 0;

	for (const contentPath of contentPaths) {
		console.log(chalk.blue(`🔍 Checking content quality in ${contentPath}`));

		const parsedFiles = await parseContentFiles(contentPath);

		if (parsedFiles.length === 0) {
			console.log(chalk.yellow(`No MDX files found in ${contentPath}`));
			continue;
		}

		let mismatchCount = 0;

		for (const parsedFile of parsedFiles) {
			const imageFeatured = ImageFeaturedSchema.optional().parse(
				parsedFile.frontmatter.imageFeatured,
			);
			const entryQuality = z.number().parse(parsedFile.frontmatter.entryQuality);

			if (imageFeatured && entryQuality && entryQuality < 2) {
				console.log(chalk.red(`❌ ${parsedFile.filename}`));
				console.log(chalk.red('   ERROR: Image featured but entry quality is low'));
				mismatchCount++;
			}
		}

		if (mismatchCount === 0) {
			console.log(chalk.green(`✓ ${parsedFiles.length.toString()} entry quality values valid`));
		} else {
			console.log(chalk.yellow(`⚠️  Found ${mismatchCount.toString()} quality issue(s)`));
			overallMismatchCount += mismatchCount;
		}
	}

	// Return a boolean to control flow of the main script
	return overallMismatchCount === 0;
}
