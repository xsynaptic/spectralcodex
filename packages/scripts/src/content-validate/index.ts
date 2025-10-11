#!/usr/bin/env tsx
import chalk from 'chalk';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { $ } from 'zx';

import { ContentCollectionsEnum } from '../content-utils/collections';
import { checkDivisionIds } from './divisions';
import { checkLocationsRegions } from './locations-region';
import { checkLocationsVisibility } from './locations-visibility';
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

const ContentFilesPathEnum = {
	Ephemera: path.join(
		values['root-path'],
		values['content-path'],
		'collections',
		ContentCollectionsEnum.Ephemera,
	),
	Locations: path.join(
		values['root-path'],
		values['content-path'],
		'collections',
		ContentCollectionsEnum.Locations,
	),
	Posts: path.join(
		values['root-path'],
		values['content-path'],
		'collections',
		ContentCollectionsEnum.Posts,
	),
	Regions: path.join(
		values['root-path'],
		values['content-path'],
		'collections',
		ContentCollectionsEnum.Regions,
	),
} as const;

const command = positionals[0];

// Note: there is no need for a help command
switch (command) {
	case 'slug-mismatch': {
		await checkSlugMismatches(ContentFilesPathEnum);
		break;
	}
	case 'location-regions': {
		await checkLocationsRegions(ContentFilesPathEnum.Locations);
		break;
	}
	case 'location-visibility': {
		await checkLocationsVisibility(ContentFilesPathEnum.Locations);
		break;
	}
	case 'divisions': {
		await checkDivisionIds(ContentFilesPathEnum.Regions);
		break;
	}
	case 'quality': {
		await checkContentQuality(ContentFilesPathEnum);
		break;
	}
	default: {
		if (command) {
			console.log(chalk.red('Unknown command: ' + command));
			process.exit(1);
		}

		// Run all validations for deployment - exit immediately on first failure
		const slugSuccess = await checkSlugMismatches(ContentFilesPathEnum);

		if (!slugSuccess) process.exit(1);

		const regionSuccess = await checkLocationsRegions(ContentFilesPathEnum.Locations);

		if (!regionSuccess) process.exit(1);

		break;
	}
}
