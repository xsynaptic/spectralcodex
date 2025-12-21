#!/usr/bin/env tsx
import chalk from 'chalk';
import { z } from 'zod';

import { parseContentFiles } from '../content-utils';

export async function checkSlugMismatches(contentPaths: Array<string>) {
	let overallMismatchCount = 0;

	for (const contentPath of contentPaths) {
		console.log(chalk.blue(`🔍 Checking slugs in ${contentPath}`));

		const parsedFiles = await parseContentFiles(contentPath);

		if (parsedFiles.length === 0) {
			console.log(chalk.yellow(`No MDX files found in ${contentPath}`));
			continue;
		}

		let mismatchCount = 0;

		for (const parsedFile of parsedFiles) {
			const slug = z.string().optional().parse(parsedFile.frontmatter.slug);

			try {
				if (!slug) {
					console.log(chalk.red(`❌ ${parsedFile.filename}`));
					console.log(chalk.red('   ERROR: No slug field found'));
					mismatchCount++;
				} else if (slug !== parsedFile.id) {
					console.log(chalk.red(`❌ ${parsedFile.filename}`));
					console.log(chalk.red(`   Expected: ${parsedFile.id}, Found: ${slug}`));
					mismatchCount++;
				}
			} catch (error) {
				console.log(chalk.red(`❌ ${parsedFile.filename}`));
				console.log(chalk.red(`   ERROR: Failed to read file - ${String(error)}`));
				mismatchCount++;
			}
		}

		if (mismatchCount === 0) {
			console.log(chalk.green(`✓ ${parsedFiles.length.toString()} slugs valid`));
		} else {
			console.log(chalk.yellow(`⚠️  Found ${mismatchCount.toString()} slug mismatch(es)`));
			overallMismatchCount += mismatchCount;
		}
	}

	// Return a boolean to control flow of the main script
	return overallMismatchCount === 0;
}
