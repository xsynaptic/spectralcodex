#!/usr/bin/env tsx
import chalk from 'chalk';
import path from 'node:path';
import { parseArgs } from 'node:util';

import { DATA_STORE_PATH, getDataStoreCollection, loadDataStore } from '../shared/data-store';
import { findWorkspaceRoot } from '../shared/utils.js';
import { checkEntryIds } from './entry-ids';
import { checkFrontmatterLinks } from './frontmatter-links';
import { checkImageAspectRatios } from './image-aspect-ratios';
import { checkImageFeaturedInBody } from './image-featured-in-body';
import { checkImageFeaturedLinks } from './image-featured-links';
import { checkImageReferences } from './images';
import { checkLinkIds } from './link-ids';
import { checkLocationsCoordinates } from './locations-coordinates';
import { checkLocationsDuplicates } from './locations-duplicates';
import { checkLocationsOverlap } from './locations-overlap';
import { checkLocationsRegions } from './locations-region';
import { checkMdxComponents } from './mdx';
import { checkReferences } from './references';
import { checkRegionsParents } from './regions-parent';
import { checkSeriesItems } from './series-items';
import { checkSourceIds } from './source-ids';

const rootPath = findWorkspaceRoot();

const { values, positionals } = parseArgs({
	args: process.argv.slice(2),
	options: {
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

const dataStorePath = path.join(rootPath, DATA_STORE_PATH);
const { collections } = loadDataStore(dataStorePath);

const command = positionals[0];

const contentCollectionNames = [
	'chronology',
	'locations',
	'pages',
	'posts',
	'regions',
	'resources',
	'series',
	'themes',
];

const allEntries = getDataStoreCollection(collections, contentCollectionNames);

const metadataEntries = getDataStoreCollection(collections, [
	'locations',
	'pages',
	'posts',
	'regions',
	'series',
	'themes',
]);

const bodyContentEntries = getDataStoreCollection(collections, ['locations', 'posts']);

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
			path.join(rootPath, values['divisions-path']),
		);
		break;
	}
	// Check for locations that are too close to each other
	case 'location-overlap': {
		checkLocationsOverlap(
			getDataStoreCollection(collections, ['locations']),
			Number(values.threshold),
		);
		break;
	}
	// Check for duplicate location data (titles, addresses, links)
	case 'location-duplicates': {
		checkLocationsDuplicates(getDataStoreCollection(collections, ['locations']));
		break;
	}
	// Check that entry IDs are unique across every collection
	case 'entry-ids': {
		checkEntryIds(allEntries);
		break;
	}
	// Check that reference fields point at entries that exist
	case 'references': {
		checkReferences(collections, contentCollectionNames);
		break;
	}
	// Check for regions whose parent does not reference an existing region
	case 'region-parents': {
		checkRegionsParents(getDataStoreCollection(collections, ['regions']));
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
	// Check for series items that do not name an existing entry
	case 'series-items': {
		checkSeriesItems(getDataStoreCollection(collections, ['series']), metadataEntries);
		break;
	}
	// Check for shortform sources that do not name an existing resource
	case 'source-ids': {
		checkSourceIds(allEntries, resourceEntries);
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
	// Check for imageFeatured.link references that do not resolve to any content
	case 'image-featured-links': {
		checkImageFeaturedLinks(allEntries, metadataEntries);
		break;
	}
	// Check for image references that do not exist
	case 'images': {
		checkImageReferences(allEntries, path.join(rootPath, values['media-path']));
		break;
	}
	// Check for images with non-standard aspect ratios (*e.g.* 3:2, 2:3, 1:1)
	case 'image-aspect-ratios': {
		checkImageAspectRatios(getDataStoreCollection(collections, ['images']), { showStats: true });
		break;
	}
	default: {
		if (command) {
			console.log(chalk.red('Unknown command: ' + command));
			process.exit(1);
		}

		// Run all validations for deployment and report all problems at once
		const syncResults: Array<boolean> = [
			checkEntryIds(allEntries),
			checkReferences(collections, contentCollectionNames),
			checkMdxComponents(allEntries),
			checkLinkIds(allEntries, metadataEntries),
			checkSeriesItems(getDataStoreCollection(collections, ['series']), metadataEntries),
			checkSourceIds(allEntries, resourceEntries),
			checkFrontmatterLinks(allEntries, resourceEntries),
			checkImageReferences(allEntries, path.join(rootPath, values['media-path'])),
			checkImageAspectRatios(getDataStoreCollection(collections, ['images']), { showStats: true }),
			checkImageFeaturedInBody(bodyContentEntries),
			checkImageFeaturedLinks(allEntries, metadataEntries),
			checkLocationsDuplicates(getDataStoreCollection(collections, ['locations'])),
			checkLocationsRegions(getDataStoreCollection(collections, ['locations'])),
			checkLocationsOverlap(
				getDataStoreCollection(collections, ['locations']),
				Number(values.threshold),
			),
			checkRegionsParents(getDataStoreCollection(collections, ['regions'])),
		];

		const asyncResults = await checkLocationsCoordinates(
			getDataStoreCollection(collections, ['locations']),
			path.join(rootPath, values['divisions-path']),
		);

		if ([...syncResults, asyncResults].some((success) => !success)) process.exit(1);

		break;
	}
}
