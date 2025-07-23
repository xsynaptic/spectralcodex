#!/usr/bin/env tsx
import chalk from 'chalk';
import { parseArgs } from 'node:util';
import { $ } from 'zx';

import { checkDivisionIds } from './divisions';
import { checkLocationRegions } from './locations-region';
import { checkSlugMismatches } from './slug-mismatch';

const { values: args, positionals } = parseArgs({
	args: process.argv.slice(2),
	options: {
		verbose: {
			type: 'boolean',
			short: 'v',
			default: false,
		},
	},
	allowPositionals: true,
});

// Output shell command results only in verbose mode
$.verbose = args.verbose;

const ContentCollectionsPathEnum = {
	Ephemera: './packages/content/collections/ephemera',
	Locations: './packages/content/collections/locations',
	Posts: './packages/content/collections/posts',
	Regions: './packages/content/collections/regions',
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
	console.log('');
	console.log('Options:');
	console.log('  --verbose        Show detailed output');
	console.log('');
	console.log('Usage:');
	console.log('  pnpm content-utils slug-mismatch');
	console.log('  pnpm content-utils location-regions');
	console.log('  pnpm content-utils divisions');
}

const command = positionals[0];

switch (command) {
	case 'slug-mismatch': {
		await checkSlugMismatches(ContentCollectionsPathEnum);
		break;
	}
	case 'location-regions': {
		await checkLocationRegions(ContentCollectionsPathEnum.Locations);
		break;
	}
	case 'divisions': {
		await checkDivisionIds(ContentCollectionsPathEnum.Regions);
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
		const slugSuccess = await checkSlugMismatches(ContentCollectionsPathEnum);

		if (!slugSuccess) process.exit(1);

		const regionSuccess = await checkLocationRegions(ContentCollectionsPathEnum.Locations);

		if (!regionSuccess) process.exit(1);

		break;
	}
}
