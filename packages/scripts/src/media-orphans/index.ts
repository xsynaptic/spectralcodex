#!/usr/bin/env tsx
/**
 * Find orphaned media files not referenced in any content
 */
import path from 'node:path';
import { parseArgs } from 'node:util';

import { getDataStoreCollection, loadDataStore } from '../shared/data-store';
import { collectMediaFiles, extractImageFeaturedIds, extractMdxImageIds } from '../shared/images';

const { values } = parseArgs({
	args: process.argv.slice(2),
	options: {
		'root-path': {
			type: 'string',
			default: process.cwd(),
		},
		'data-store-path': {
			type: 'string',
			default: '.astro/data-store.json',
		},
		'media-path': {
			type: 'string',
			default: 'packages/content/media',
		},
	},
});

const dataStorePath = path.join(values['root-path'], values['data-store-path']);
const mediaPath = path.join(values['root-path'], values['media-path']);

const { collections } = loadDataStore(dataStorePath);

const allEntries = [
	...getDataStoreCollection(collections, 'archives'),
	...getDataStoreCollection(collections, 'ephemera'),
	...getDataStoreCollection(collections, 'locations'),
	...getDataStoreCollection(collections, 'pages'),
	...getDataStoreCollection(collections, 'posts'),
	...getDataStoreCollection(collections, 'regions'),
	...getDataStoreCollection(collections, 'resources'),
	...getDataStoreCollection(collections, 'series'),
	...getDataStoreCollection(collections, 'themes'),
];

const mediaFiles = collectMediaFiles(mediaPath);
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
