#!/usr/bin/env tsx
import { ImageFeaturedSchema } from '@spectralcodex/shared/schemas';
import chalk from 'chalk';
import path from 'node:path';
import { z } from 'zod';

import type { DataStoreEntry } from '../shared/data-store';

export function checkContentQuality(entriesByCollection: Array<[string, Array<DataStoreEntry>]>) {
	let overallMismatchCount = 0;

	for (const [collectionName, entries] of entriesByCollection) {
		console.log(chalk.blue(`🔍 Checking content quality in ${collectionName}`));

		if (entries.length === 0) {
			console.log(chalk.yellow(`No entries found in ${collectionName}`));
			continue;
		}

		let mismatchCount = 0;

		for (const entry of entries) {
			const imageFeatured = ImageFeaturedSchema.optional().parse(entry.data.imageFeatured);
			const entryQuality = z.number().optional().parse(entry.data.entryQuality);

			// Skip entries without entryQuality (collection doesn't use this field)
			if (entryQuality === undefined) continue;

			if (imageFeatured && entryQuality < 2) {
				const filename = entry.filePath ? path.basename(entry.filePath) : entry.id;
				console.log(chalk.red(`❌ ${filename}`));
				console.log(chalk.red('   ERROR: Image featured but entry quality is low'));
				mismatchCount++;
			}
		}

		if (mismatchCount === 0) {
			console.log(chalk.green(`✓ ${entries.length.toString()} entry quality values valid`));
		} else {
			console.log(chalk.yellow(`⚠️  Found ${mismatchCount.toString()} quality issue(s)`));
			overallMismatchCount += mismatchCount;
		}
	}

	return overallMismatchCount === 0;
}
