#!/usr/bin/env tsx
import chalk from 'chalk';
import path from 'node:path';
import { z } from 'zod';

import type { DataStoreEntry } from '../shared/data-store';

export function checkSlugMismatches(entriesByCollection: Array<[string, Array<DataStoreEntry>]>) {
	let overallMismatchCount = 0;

	for (const [, entries] of entriesByCollection) {
		for (const entry of entries) {
			const slug = z.string().optional().parse(entry.data.slug);
			const filename = entry.filePath ? path.basename(entry.filePath) : entry.id;

			try {
				if (!slug) {
					console.log(chalk.red(`❌ ${filename}`));
					console.log(chalk.red('   ERROR: No slug field found'));
					overallMismatchCount++;
				} else if (slug !== entry.id) {
					console.log(chalk.red(`❌ ${filename}`));
					console.log(chalk.red(`   Expected: ${entry.id}, Found: ${slug}`));
					overallMismatchCount++;
				}
			} catch (error) {
				console.log(chalk.red(`❌ ${filename}`));
				console.log(chalk.red(`   ERROR: Failed to read file - ${String(error)}`));
				overallMismatchCount++;
			}
		}
	}

	if (overallMismatchCount === 0) {
		console.log(chalk.green('✓ Slugs valid'));
	} else {
		console.log(chalk.yellow(`⚠️  Found ${overallMismatchCount.toString()} slug mismatch(es)`));
	}

	return overallMismatchCount === 0;
}
