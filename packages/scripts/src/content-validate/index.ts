#!/usr/bin/env tsx
import chalk from 'chalk';
import path from 'node:path';
import { parseArgs } from 'node:util';

import type { DataStoreEntry } from '../shared/data-store';

import { getDataStoreCollection, loadDataStore } from '../shared/data-store';
import { checkDivisionIds } from './divisions';
import { checkImageReferences } from './images';
import { checkLinkIds } from './link-ids';
import { checkLocationsCoordinates } from './locations-coordinates';
import { checkLocationsDuplicates } from './locations-duplicates';
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

type CollectionEntries = Array<[string, Array<DataStoreEntry>]>;

const allCollections: CollectionEntries = [
	['archives', getDataStoreCollection(collections, 'archives')],
	['ephemera', getDataStoreCollection(collections, 'ephemera')],
	['locations', getDataStoreCollection(collections, 'locations')],
	['pages', getDataStoreCollection(collections, 'pages')],
	['posts', getDataStoreCollection(collections, 'posts')],
	['regions', getDataStoreCollection(collections, 'regions')],
	['resources', getDataStoreCollection(collections, 'resources')],
	['series', getDataStoreCollection(collections, 'series')],
	['themes', getDataStoreCollection(collections, 'themes')],
];

const checkSlugCollections: CollectionEntries = [
	['ephemera', getDataStoreCollection(collections, 'ephemera')],
	['locations', getDataStoreCollection(collections, 'locations')],
	['posts', getDataStoreCollection(collections, 'posts')],
	['regions', getDataStoreCollection(collections, 'regions')],
];

const qualityCollections: CollectionEntries = [
	['ephemera', getDataStoreCollection(collections, 'ephemera')],
	['locations', getDataStoreCollection(collections, 'locations')],
	['posts', getDataStoreCollection(collections, 'posts')],
	['regions', getDataStoreCollection(collections, 'regions')],
	['series', getDataStoreCollection(collections, 'series')],
	['themes', getDataStoreCollection(collections, 'themes')],
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
		checkLocationsRegions(getDataStoreCollection(collections, 'locations'));
		break;
	}
	// Check for locations not inside their assigned regions
	case 'location-coordinates': {
		await checkLocationsCoordinates(
			getDataStoreCollection(collections, 'locations'),
			path.join(values['root-path'], values['divisions-path']),
		);
		break;
	}
	// Check for locations that are too close to each other
	case 'location-overlap': {
		checkLocationsOverlap(
			getDataStoreCollection(collections, 'locations'),
			Number.parseInt(values.threshold, 10),
		);
		break;
	}
	// Check for duplicate location data (slugs, titles, addresses, links)
	case 'location-duplicates': {
		checkLocationsDuplicates(getDataStoreCollection(collections, 'locations'));
		break;
	}
	// Check for regions without a divisionId
	case 'divisions': {
		checkDivisionIds(getDataStoreCollection(collections, 'regions'));
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
	// Check for Link components referencing non-existent entry IDs
	case 'link-ids': {
		checkLinkIds(allCollections);
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

		// Run all validations for deployment and report all problems at once
		const syncResults: Array<boolean> = [
			checkMdxComponents(allCollections),
			checkLinkIds(allCollections),
			checkImageReferences(
				allCollections.flatMap(([, entries]) => entries),
				path.join(values['root-path'], values['media-path']),
			),
			checkSlugMismatches(checkSlugCollections),
			checkContentQuality(qualityCollections),
			checkLocationsDuplicates(getDataStoreCollection(collections, 'locations')),
			checkLocationsRegions(getDataStoreCollection(collections, 'locations')),
			checkLocationsOverlap(
				getDataStoreCollection(collections, 'locations'),
				Number.parseInt(values.threshold, 10),
			),
			checkDivisionIds(getDataStoreCollection(collections, 'regions')),
		];

		const asyncResults = await checkLocationsCoordinates(
			getDataStoreCollection(collections, 'locations'),
			path.join(values['root-path'], values['divisions-path']),
		);

		if ([...syncResults, asyncResults].some((success) => !success)) process.exit(1);

		break;
	}
}
