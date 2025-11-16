#!/usr/bin/env tsx
import chalk from 'chalk';
import { z } from 'zod';

import { parseContentFiles } from '../content-utils';

export async function checkSlugMismatches(contentPaths: Record<string, string>) {
	let overallMismatchCount = 0;

	for (const contentPath of Object.values(contentPaths)) {
		console.log(chalk.blue('Checking for slug/filename mismatches in ' + contentPath + '...'));

		const parsedFiles = await parseContentFiles(contentPath);

		if (parsedFiles.length === 0) {
			console.log(chalk.yellow('No MDX files found in specified collections.'));
			continue;
		}

		let mismatchCount = 0;

		for (const parsedFile of parsedFiles) {
			const slug = z.string().optional().parse(parsedFile.frontmatter.slug);

			try {
				if (!slug) {
					console.log(chalk.red('❌ ' + parsedFile.filename));
					console.log(chalk.red('   ERROR: No slug field found'));
					mismatchCount++;
				} else if (slug !== parsedFile.id) {
					console.log(chalk.red('❌ ' + parsedFile.filename));
					console.log(chalk.red('   Expected: ' + parsedFile.id + ', Found: ' + slug));
					mismatchCount++;
				}
			} catch (error) {
				console.log(chalk.red('❌ ' + parsedFile.filename));
				console.log(chalk.red('   ERROR: Failed to read file - ' + String(error)));
				mismatchCount++;
			}
		}

		console.log(chalk.blue('='.repeat(50)));
		console.log(chalk.blue('Total files checked: ' + parsedFiles.length.toString()));
		console.log(chalk.blue('Mismatches found: ' + mismatchCount.toString()));

		if (mismatchCount === 0) {
			console.log(chalk.green('🎉 All slugs match their filenames!'));
		} else {
			console.log(
				chalk.yellow(
					'⚠️  Found ' + mismatchCount.toString() + ' file(s) with slug/filename mismatches',
				),
			);
			overallMismatchCount += mismatchCount;
		}
	}

	// Return a boolean to control flow of the main script
	return overallMismatchCount === 0;
}
