#!/usr/bin/env tsx
import chalk from 'chalk';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { $ } from 'zx';

import { getContentCollectionPaths } from '../content-utils/collections';
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
			short: 'r',
			default: process.cwd(),
		},
		'content-path': {
			type: 'string',
			short: 'c',
			default: 'packages/content',
		},
		'divisions-path': {
			type: 'string',
			short: 'd',
			default: './public/divisions',
		},
		'media-path': {
			type: 'string',
			short: 'm',
			default: 'packages/content/media',
		},
		verbose: {
			type: 'boolean',
			short: 'v',
			default: false,
		},
		threshold: {
			type: 'string',
			short: 't',
			default: '10',
		},
	},
	allowPositionals: true,
});

// Output shell command results only in verbose mode
$.verbose = values.verbose;

const ContentCollectionsPaths = getContentCollectionPaths(
	values['root-path'],
	values['content-path'],
);

const command = positionals[0];

const checkSlugPaths = [
	ContentCollectionsPaths.Ephemera,
	ContentCollectionsPaths.Locations,
	ContentCollectionsPaths.Posts,
	ContentCollectionsPaths.Regions,
];

// Note: there is no need for a help command
switch (command) {
	// Check for slugs that don't match filenames
	case 'slug-mismatch': {
		await checkSlugMismatches(checkSlugPaths);
		break;
	}
	// Check for locations not assigned to regions OR locations with mismatching regions and assigned paths
	case 'location-regions': {
		await checkLocationsRegions(ContentCollectionsPaths.Locations);
		break;
	}
	// Check for locations not inside their assigned regions
	case 'location-coordinates': {
		await checkLocationsCoordinates(
			ContentCollectionsPaths.Locations,
			path.join(values['root-path'], values['divisions-path']),
		);
		break;
	}
	// Check for locations that are too close to each other
	case 'location-overlap': {
		await checkLocationsOverlap(
			ContentCollectionsPaths.Locations,
			Number.parseInt(values.threshold, 10),
		);
		break;
	}
	// Check for regions without a divisionId
	case 'divisions': {
		await checkDivisionIds(ContentCollectionsPaths.Regions);
		break;
	}
	// Check for quality mismatch e.g. entry has a featured image but hasn't been bumped to quality 2
	case 'quality': {
		await checkContentQuality(Object.values(ContentCollectionsPaths));
		break;
	}
	// Check for malformed MDX components
	case 'mdx': {
		await checkMdxComponents(Object.values(ContentCollectionsPaths));
		break;
	}
	// Check for image references that do not exist
	case 'images': {
		await checkImageReferences(
			Object.values(ContentCollectionsPaths),
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
		const mdxSuccess = await checkMdxComponents(Object.values(ContentCollectionsPaths));

		if (!mdxSuccess) process.exit(1);

		const imagesSuccess = await checkImageReferences(
			Object.values(ContentCollectionsPaths),
			path.join(values['root-path'], values['media-path']),
		);

		if (!imagesSuccess) process.exit(1);

		const slugSuccess = await checkSlugMismatches(checkSlugPaths);

		if (!slugSuccess) process.exit(1);

		const qualitySuccess = await checkContentQuality(Object.values(ContentCollectionsPaths));

		if (!qualitySuccess) process.exit(1);

		const regionSuccess = await checkLocationsRegions(ContentCollectionsPaths.Locations);

		if (!regionSuccess) process.exit(1);

		const coordinatesSuccess = await checkLocationsCoordinates(
			ContentCollectionsPaths.Locations,
			path.join(values['root-path'], values['divisions-path']),
		);

		if (!coordinatesSuccess) process.exit(1);

		const overlapSuccess = await checkLocationsOverlap(
			ContentCollectionsPaths.Locations,
			Number.parseInt(values.threshold, 10),
		);

		if (!overlapSuccess) process.exit(1);

		const divisionsSuccess = await checkDivisionIds(ContentCollectionsPaths.Regions);

		if (!divisionsSuccess) process.exit(1);

		break;
	}
}
