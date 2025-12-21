#!/usr/bin/env tsx
import chalk from 'chalk';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { $ } from 'zx';

import { getContentCollectionPaths } from '../content-utils/collections';
import { checkDivisionIds } from './divisions';
import { checkImageReferences } from './images';
import { checkLocationsCoordinates } from './locations-coordinates';
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
	case 'slug-mismatch': {
		await checkSlugMismatches(checkSlugPaths);
		break;
	}
	case 'location-regions': {
		await checkLocationsRegions(ContentCollectionsPaths.Locations);
		break;
	}
	case 'location-coordinates': {
		await checkLocationsCoordinates(
			ContentCollectionsPaths.Locations,
			path.join(values['root-path'], values['divisions-path']),
		);
		break;
	}
	case 'divisions': {
		await checkDivisionIds(ContentCollectionsPaths.Regions);
		break;
	}
	case 'quality': {
		await checkContentQuality(Object.values(ContentCollectionsPaths));
		break;
	}
	case 'mdx': {
		await checkMdxComponents(Object.values(ContentCollectionsPaths));
		break;
	}
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

		const divisionsSuccess = await checkDivisionIds(ContentCollectionsPaths.Regions);

		if (!divisionsSuccess) process.exit(1);

		break;
	}
}
