#!/usr/bin/env tsx
import { lookupCollection } from '@iconify/json';
import { blankIconSet, exportToDirectory, IconSet } from '@iconify/tools';
import { getIcons, validateIconSet } from '@iconify/utils';
import { mapIcons } from '@spectralcodex/map-types';
import chalk from 'chalk';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { $ } from 'zx';

// Parse command line arguments
const { values: args } = parseArgs({
	args: process.argv.slice(2),
	options: {
		'root-path': {
			type: 'string',
			short: 'r',
			default: process.cwd(),
		},
		'output-path': {
			type: 'string',
			short: 'o',
			default: './public/icons',
		},
		'temp-path': {
			type: 'string',
			short: 't',
			default: './temp/icons',
		},
		'skip-export': {
			type: 'boolean',
			short: 's',
			default: false,
		},
		verbose: {
			type: 'boolean',
			short: 'v',
			default: false,
		},
	},
});

const iconsPath = path.join(args['root-path'], args['temp-path']);
const outputPath = path.join(args['root-path'], args['output-path']);

// Output shell command results
$.verbose = args.verbose;

// Populate a custom icon set with whatever we might use in maps
async function exportMapIcons(iconRecord: Record<string, string>): Promise<void> {
	if (args['skip-export']) {
		console.log(chalk.yellow('Skipping icon export...'));
		return;
	}

	console.log(chalk.blue('Exporting map icons from Iconify collections...'));

	try {
		const mapIconSet = blankIconSet('mapIcons');

		for (const [iconId, iconRequest] of Object.entries(iconRecord)) {
			const [iconCollectionId, iconName] = iconRequest.split(':');

			if (iconCollectionId && iconName) {
				const iconCollection = await lookupCollection(iconCollectionId);

				// Fetch the target icon from the collection
				const iconDataRaw = getIcons(iconCollection, [iconName], true);

				if (iconDataRaw?.not_found && iconDataRaw.not_found.length > 0) {
					throw new Error(`Icon not found: ${iconDataRaw.not_found.join(', ')}`);
				}

				const iconDataValidated = validateIconSet(iconDataRaw);
				const iconSetRequested = new IconSet(iconDataValidated);
				const iconResolved = iconSetRequested.resolve(iconName);

				if (iconResolved) {
					mapIconSet.setIcon(iconId, iconResolved);
					if (args.verbose) console.log(chalk.green(`✓ Exported: ${iconId} (${iconRequest})`));
				} else {
					console.log(chalk.red(`✗ Missing ${iconName} (${iconId})!`));
				}
			}
		}

		await exportToDirectory(mapIconSet, {
			cleanup: true,
			log: args.verbose,
			target: iconsPath,
		});

		console.log(
			chalk.green(`Icons exported to ${path.join(args['root-path'], args['output-path'])}`),
		);
	} catch (error) {
		console.error(chalk.red('Error exporting icons:'), error);
		process.exit(1);
	}
}

// Generate sprites using spreet
async function generateMapSpritesheet(): Promise<void> {
	console.log(chalk.blue('Generating map icon spritesheets...'));

	try {
		await $`spreet --unique --minify-index-file --sdf ${iconsPath} ${outputPath}/map-icons`;
		await $`spreet --retina --unique --minify-index-file --sdf ${iconsPath} ${outputPath}/map-icons@2x`;

		console.log(chalk.green('Spritesheets generated successfully'));
	} catch (error) {
		console.error(chalk.red('Error generating spritesheets:'), error);
		process.exit(1);
	}
}

await exportMapIcons(mapIcons);
await generateMapSpritesheet();
