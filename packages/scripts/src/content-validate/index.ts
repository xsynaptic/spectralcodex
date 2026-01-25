#!/usr/bin/env tsx
import chalk from 'chalk';
import path from 'node:path';
import { parseArgs } from 'node:util';

import { getCollection, loadDataStore } from '../content-utils/data-store';
import { checkDivisionIds } from './divisions';
import { checkImageReferences } from './images';
import { checkLocationsCoordinates } from './locations-coordinates';
import { checkLocationsOverlap } from './locations-overlap';
import { checkLocationsRegions } from './locations-region';
import { checkMdxComponents } from './mdx';
import { checkContentQuality } from './quality';
import { checkSlugMismatches } from './slug-mismatch';

const { values, positionals } = parseArgs({
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
		'divisions-path': {
			type: 'string',
			default: './public/divisions',
		},
		'media-path': {
			type: 'string',
			default: 'packages/content/media',
		},
		threshold: {
			type: 'string',
			default: '10',
		},
	},
	allowPositionals: true,
});

const dataStorePath = path.join(values['root-path'], values['data-store-path']);
const { collections } = loadDataStore(dataStorePath);

const command = positionals[0];

type CollectionEntries = Array<
	[string, Array<import('../content-utils/data-store').DataStoreEntry>]
>;

const checkSlugCollections: CollectionEntries = [
	['ephemera', getCollection(collections, 'ephemera')],
	['locations', getCollection(collections, 'locations')],
	['posts', getCollection(collections, 'posts')],
	['regions', getCollection(collections, 'regions')],
];

const allCollections: CollectionEntries = [
	['archives', getCollection(collections, 'archives')],
	['ephemera', getCollection(collections, 'ephemera')],
	['locations', getCollection(collections, 'locations')],
	['pages', getCollection(collections, 'pages')],
	['posts', getCollection(collections, 'posts')],
	['regions', getCollection(collections, 'regions')],
	['resources', getCollection(collections, 'resources')],
	['series', getCollection(collections, 'series')],
	['themes', getCollection(collections, 'themes')],
];

const qualityCollections: CollectionEntries = [
	['ephemera', getCollection(collections, 'ephemera')],
	['locations', getCollection(collections, 'locations')],
	['posts', getCollection(collections, 'posts')],
	['regions', getCollection(collections, 'regions')],
	['series', getCollection(collections, 'series')],
	['themes', getCollection(collections, 'themes')],
];

// Note: there is no need for a help command
switch (command) {
	// Check for slugs that don't match filenames
	case 'slug-mismatch': {
		checkSlugMismatches(checkSlugCollections);
		break;
	}
	// Check for locations not assigned to regions OR locations with mismatching regions and assigned paths
	case 'location-regions': {
		checkLocationsRegions(getCollection(collections, 'locations'));
		break;
	}
	// Check for locations not inside their assigned regions
	case 'location-coordinates': {
		await checkLocationsCoordinates(
			getCollection(collections, 'locations'),
			path.join(values['root-path'], values['divisions-path']),
		);
		break;
	}
	// Check for locations that are too close to each other
	case 'location-overlap': {
		checkLocationsOverlap(
			getCollection(collections, 'locations'),
			Number.parseInt(values.threshold, 10),
		);
		break;
	}
	// Check for regions without a divisionId
	case 'divisions': {
		checkDivisionIds(getCollection(collections, 'regions'));
		break;
	}
	// Check for quality mismatch e.g. entry has a featured image but hasn't been bumped to quality 2
	case 'quality': {
		checkContentQuality(allCollections);
		break;
	}
	// Check for malformed MDX components
	case 'mdx': {
		checkMdxComponents(allCollections);
		break;
	}
	// Check for image references that do not exist
	case 'images': {
		checkImageReferences(
			allCollections.flatMap(([, entries]) => entries),
			path.join(values['root-path'], values['media-path']),
		);
		break;
	}
	default: {
		if (command) {
			console.log(chalk.red('Unknown command: ' + command));
			process.exit(1);
		}

		// Run all validations for deployment - exit immediately on first failure
		const mdxSuccess = checkMdxComponents(allCollections);

		if (!mdxSuccess) process.exit(1);

		const imagesSuccess = checkImageReferences(
			allCollections.flatMap(([, entries]) => entries),
			path.join(values['root-path'], values['media-path']),
		);

		if (!imagesSuccess) process.exit(1);

		const slugSuccess = checkSlugMismatches(checkSlugCollections);

		if (!slugSuccess) process.exit(1);

		const qualitySuccess = checkContentQuality(qualityCollections);

		if (!qualitySuccess) process.exit(1);

		const regionSuccess = checkLocationsRegions(getCollection(collections, 'locations'));

		if (!regionSuccess) process.exit(1);

		const coordinatesSuccess = await checkLocationsCoordinates(
			getCollection(collections, 'locations'),
			path.join(values['root-path'], values['divisions-path']),
		);

		if (!coordinatesSuccess) process.exit(1);

		const overlapSuccess = checkLocationsOverlap(
			getCollection(collections, 'locations'),
			Number.parseInt(values.threshold, 10),
		);

		if (!overlapSuccess) process.exit(1);

		const divisionsSuccess = checkDivisionIds(getCollection(collections, 'regions'));

		if (!divisionsSuccess) process.exit(1);

		break;
	}
}
