/* eslint-disable unicorn/no-process-exit */
import { lookupCollection } from '@iconify/json';
import { blankIconSet, exportToDirectory, IconSet } from '@iconify/tools';
import { getIcons, validateIconSet } from '@iconify/utils';
import { mapMarkerIcons } from '@spectralcodex/map-types';
import chalk from 'chalk';
import path from 'node:path';
import { $ } from 'zx';

const iconsPath = path.join(process.cwd(), process.env.ICONS_TEMP_PATH ?? 'temp/icons');
const outputPath = process.env.ICONS_OUTPUT_PATH ?? './public/icons';

const verbose = process.argv.includes('--verbose');
const skipExport = process.argv.includes('--skip-export');

// Output shell command results
$.verbose = verbose;

// Populate a custom icon set with whatever we might use in maps
async function exportMapIcons(iconRecord: Record<string, string>): Promise<void> {
	if (skipExport) {
		console.log(chalk.yellow('Skipping icon export...'));
		return;
	}

	console.log(chalk.blue('Exporting map icons from Iconify collections...'));

	try {
		const mapIcons = blankIconSet('mapIcons');

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
					mapIcons.setIcon(iconId, iconResolved);
					if (verbose) console.log(chalk.green(`✓ Exported: ${iconId} (${iconRequest})`));
				} else {
					console.log(chalk.red(`✗ Missing ${iconName} (${iconId})!`));
				}
			}
		}

		await exportToDirectory(mapIcons, {
			cleanup: true,
			log: verbose,
			target: iconsPath,
		});

		console.log(chalk.green(`Icons exported to ${iconsPath}`));
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

await exportMapIcons(mapMarkerIcons);
await generateMapSpritesheet();
