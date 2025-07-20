/* eslint-disable unicorn/no-process-exit */
import { lookupCollection } from '@iconify/json';
import { blankIconSet, exportToDirectory, IconSet } from '@iconify/tools';
import { getIcons, validateIconSet } from '@iconify/utils';
import { mapIcons } from '@spectralcodex/map-types';
import chalk from 'chalk';
import path from 'node:path';
import { $ } from 'zx';

// Parse command line arguments
const args = process.argv.slice(2);

const verbose = args.includes('--verbose');
const skipExport = args.includes('--skip-export');

const tempDirIndex = args.indexOf('--temp-path');
const outputPathIndex = args.indexOf('--output-path');

const tempDir = args[tempDirIndex + 1] ?? 'temp/icons';
const outputPath = args[outputPathIndex + 1] ?? '../../public/icons';

const iconsPath = path.join(process.cwd(), tempDir);

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
					if (verbose) console.log(chalk.green(`✓ Exported: ${iconId} (${iconRequest})`));
				} else {
					console.log(chalk.red(`✗ Missing ${iconName} (${iconId})!`));
				}
			}
		}

		await exportToDirectory(mapIconSet, {
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

await exportMapIcons(mapIcons);
await generateMapSpritesheet();
