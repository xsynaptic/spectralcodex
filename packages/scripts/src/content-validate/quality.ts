#!/usr/bin/env tsx
import { ImageFeaturedSchema } from '@spectralcodex/shared/schemas';
import chalk from 'chalk';
import path from 'node:path';
import { z } from 'zod';

import type { DataStoreEntry } from '../shared/data-store';

export function checkContentQuality(entriesByCollection: Array<[string, Array<DataStoreEntry>]>) {
	let overallMismatchCount = 0;

	for (const [, entries] of entriesByCollection) {
		for (const entry of entries) {
			const imageFeatured = ImageFeaturedSchema.optional().parse(entry.data.imageFeatured);
			const entryQuality = z.number().optional().parse(entry.data.entryQuality);

			// Skip entries without entryQuality (collection doesn't use this field)
			if (entryQuality === undefined) continue;

			if (imageFeatured && entryQuality < 2) {
				const filename = entry.filePath ? path.basename(entry.filePath) : entry.id;
				console.log(chalk.red(`❌ ${filename}`));
				console.log(chalk.red('   ERROR: Image featured but entry quality is low'));
				overallMismatchCount++;
			}
		}
	}

	if (overallMismatchCount === 0) {
		console.log(chalk.green('✓ Content quality valid'));
	} else {
		console.log(chalk.yellow(`⚠️  Found ${overallMismatchCount.toString()} quality issue(s)`));
	}

	return overallMismatchCount === 0;
}
