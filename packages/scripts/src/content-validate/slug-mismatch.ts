#!/usr/bin/env tsx
import chalk from 'chalk';
import path from 'node:path';
import { z } from 'zod';

import type { DataStoreEntry } from '../content-utils/data-store';

export function checkSlugMismatches(entriesByCollection: Array<[string, Array<DataStoreEntry>]>) {
	let overallMismatchCount = 0;

	for (const [collectionName, entries] of entriesByCollection) {
		console.log(chalk.blue(`🔍 Checking slugs in ${collectionName}`));

		if (entries.length === 0) {
			console.log(chalk.yellow(`No entries found in ${collectionName}`));
			continue;
		}

		let mismatchCount = 0;

		for (const entry of entries) {
			const slug = z.string().optional().parse(entry.data.slug);
			const filename = entry.filePath ? path.basename(entry.filePath) : entry.id;

			try {
				if (!slug) {
					console.log(chalk.red(`❌ ${filename}`));
					console.log(chalk.red('   ERROR: No slug field found'));
					mismatchCount++;
				} else if (slug !== entry.id) {
					console.log(chalk.red(`❌ ${filename}`));
					console.log(chalk.red(`   Expected: ${entry.id}, Found: ${slug}`));
					mismatchCount++;
				}
			} catch (error) {
				console.log(chalk.red(`❌ ${filename}`));
				console.log(chalk.red(`   ERROR: Failed to read file - ${String(error)}`));
				mismatchCount++;
			}
		}

		if (mismatchCount === 0) {
			console.log(chalk.green(`✓ ${entries.length.toString()} slugs valid`));
		} else {
			console.log(chalk.yellow(`⚠️  Found ${mismatchCount.toString()} slug mismatch(es)`));
			overallMismatchCount += mismatchCount;
		}
	}

	return overallMismatchCount === 0;
}
