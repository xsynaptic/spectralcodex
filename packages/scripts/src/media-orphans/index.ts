#!/usr/bin/env tsx
/**
 * Find orphaned media files not referenced in any content
 */
import path from 'node:path';
import { parseArgs } from 'node:util';

import { fallbackImageIds } from '../og-image/fallback.js';
import { getDataStoreCollection, loadDataStore } from '../shared/data-store';
import { collectMediaFiles, extractImageFeaturedIds, extractMdxImageIds } from '../shared/images';
import { findWorkspaceRoot } from '../shared/utils.js';

const rootPath = findWorkspaceRoot();

const { values } = parseArgs({
	args: process.argv.slice(2),
	options: {
		'data-store-path': {
			type: 'string',
			default: '.astro/data-store.json',
		},
		'media-path': {
			type: 'string',
			default: 'packages/content/media',
		},
		ignore: {
			type: 'string',
			multiple: true,
			default: [],
		},
	},
});

const dataStorePath = path.join(rootPath, values['data-store-path']);
const mediaPath = path.join(rootPath, values['media-path']);

const { collections } = loadDataStore(dataStorePath);

const allEntries = getDataStoreCollection(collections, [
	'archives',
	'notes',
	'locations',
	'pages',
	'posts',
	'regions',
	'resources',
	'series',
	'themes',
]);

const mediaFiles = collectMediaFiles(mediaPath, { ignore: values.ignore });
const referencedImages = new Set<string>();

for (const entry of allEntries) {
	const frontmatterIds = extractImageFeaturedIds(entry.data);
	const mdxIds = entry.body ? extractMdxImageIds(entry.body) : [];

	for (const id of frontmatterIds) {
		referencedImages.add(id);
	}
	for (const id of mdxIds) {
		referencedImages.add(id);
	}
}

// OG image fallbacks are referenced indirectly; seed them so they aren't flagged
for (const value of Object.values(fallbackImageIds)) {
	if (typeof value === 'string') {
		referencedImages.add(value);
	} else {
		for (const fallbackId of value) {
			referencedImages.add(fallbackId);
		}
	}
}

const orphanedFiles: Array<string> = [];

for (const file of mediaFiles) {
	if (!referencedImages.has(file)) {
		orphanedFiles.push(file);
	}
}

orphanedFiles.sort();

for (const file of orphanedFiles) {
	console.log(file);
}
