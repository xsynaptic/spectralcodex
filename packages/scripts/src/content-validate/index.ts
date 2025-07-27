#!/usr/bin/env tsx
import chalk from 'chalk';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { ContentCollectionsEnum } from 'packages/scripts/src/content-utils/collections';
import { $ } from 'zx';

import { checkDivisionIds } from './divisions';
import { checkLocationRegions } from './locations-region';
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

function showHelp() {
	console.log(chalk.blue('Content Utilities'));
	console.log(chalk.blue('================'));
	console.log('Available commands:');
	console.log('  slug-mismatch    Check for MDX files where slug field does not match filename');
	console.log('                   (locations and regions collections only)');
	console.log('  location-regions Check that location regions match their directory structure');
	console.log('                   (locations collection only)');
	console.log('  divisions        Check for regions without divisionId property');
	console.log('                   (regions collection only)');
	console.log(
		'  quality          Check for content quality issues (e.g., featured images with low quality)',
	);
	console.log('                   (on-demand validation only)');
	console.log('');
	console.log('Options:');
	console.log('  --verbose        Show detailed output');
	console.log('');
	console.log('Usage:');
	console.log('  pnpm validate-content slug-mismatch');
	console.log('  pnpm validate-content location-regions');
	console.log('  pnpm validate-content divisions');
	console.log('  pnpm validate-content quality');
}

const command = positionals[0];

switch (command) {
	case 'slug-mismatch': {
		await checkSlugMismatches(ContentFilesPathEnum);
		break;
	}
	case 'location-regions': {
		await checkLocationRegions(ContentFilesPathEnum.Locations);
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
	case 'help':
	case '--help':
	case '-h': {
		showHelp();
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

		const regionSuccess = await checkLocationRegions(ContentFilesPathEnum.Locations);

		if (!regionSuccess) process.exit(1);

		break;
	}
}
