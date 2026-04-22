#!/usr/bin/env tsx
import chalk from 'chalk';
import path from 'node:path';
import { parseArgs } from 'node:util';

import { getDataStoreCollection, loadDataStore } from '../shared/data-store';
import { checkDivisionIds } from './divisions';
import { checkFrontmatterLinks } from './frontmatter-links';
import { checkImageFeaturedInBody } from './image-featured-in-body';
import { checkImageReferences } from './images';
import { checkLinkIds } from './link-ids';
import { checkLocationsCoordinates } from './locations-coordinates';
import { checkLocationsDuplicates } from './locations-duplicates';
import { checkLocationsOverlap } from './locations-overlap';
import { checkLocationsRegions } from './locations-region';
import { checkMdxComponents } from './mdx';

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

const metadataEntries = getDataStoreCollection(collections, [
	'notes',
	'locations',
	'pages',
	'posts',
	'regions',
	'series',
	'themes',
]);

const bodyContentEntries = getDataStoreCollection(collections, ['notes', 'locations', 'posts']);

const resourceEntries = getDataStoreCollection(collections, ['resources']);

// Note: there is no need for a help command
switch (command) {
	// Check for locations not assigned to regions OR locations with mismatching regions and assigned paths
	case 'location-regions': {
		checkLocationsRegions(getDataStoreCollection(collections, ['locations']));
		break;
	}
	// Check for locations not inside their assigned regions
	case 'location-coordinates': {
		await checkLocationsCoordinates(
			getDataStoreCollection(collections, ['locations']),
			path.join(values['root-path'], values['divisions-path']),
		);
		break;
	}
	// Check for locations that are too close to each other
	case 'location-overlap': {
		checkLocationsOverlap(
			getDataStoreCollection(collections, ['locations']),
			Number.parseInt(values.threshold, 10),
		);
		break;
	}
	// Check for duplicate location data (titles, addresses, links)
	case 'location-duplicates': {
		checkLocationsDuplicates(getDataStoreCollection(collections, ['locations']));
		break;
	}
	// Check for regions without a divisionId
	case 'divisions': {
		checkDivisionIds(getDataStoreCollection(collections, ['regions']));
		break;
	}
	// Check for malformed MDX components
	case 'mdx': {
		checkMdxComponents(allEntries);
		break;
	}
	// Check for Link components referencing non-existent entry IDs
	case 'link-ids': {
		checkLinkIds(allEntries, metadataEntries);
		break;
	}
	// Check for shortform links that do not match any resource
	case 'frontmatter-links': {
		checkFrontmatterLinks(allEntries, resourceEntries);
		break;
	}
	case 'image-featured-in-body': {
		checkImageFeaturedInBody(bodyContentEntries);
		break;
	}
	// Check for image references that do not exist
	case 'images': {
		checkImageReferences(allEntries, path.join(values['root-path'], values['media-path']));
		break;
	}
	default: {
		if (command) {
			console.log(chalk.red('Unknown command: ' + command));
			process.exit(1);
		}

		// Run all validations for deployment and report all problems at once
		const syncResults: Array<boolean> = [
			checkMdxComponents(allEntries),
			checkLinkIds(allEntries, metadataEntries),
			checkFrontmatterLinks(allEntries, resourceEntries),
			checkImageReferences(allEntries, path.join(values['root-path'], values['media-path'])),
			checkImageFeaturedInBody(bodyContentEntries),
			checkLocationsDuplicates(getDataStoreCollection(collections, ['locations'])),
			checkLocationsRegions(getDataStoreCollection(collections, ['locations'])),
			checkLocationsOverlap(
				getDataStoreCollection(collections, ['locations']),
				Number.parseInt(values.threshold, 10),
			),
			checkDivisionIds(getDataStoreCollection(collections, ['regions'])),
		];

		const asyncResults = await checkLocationsCoordinates(
			getDataStoreCollection(collections, ['locations']),
			path.join(values['root-path'], values['divisions-path']),
		);

		if ([...syncResults, asyncResults].some((success) => !success)) process.exit(1);

		break;
	}
}
