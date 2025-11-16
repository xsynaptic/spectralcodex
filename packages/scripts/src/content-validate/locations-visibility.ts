#!/usr/bin/env tsx
import { LocationStatusEnum } from '@spectralcodex/map-types';
import chalk from 'chalk';
import { isIncludedIn } from 'remeda';
import { z } from 'zod';

import { parseContentFiles } from '../content-utils';

const LocationFrontmatterSchema = z.object({
	status: z.nativeEnum(LocationStatusEnum),
	safety: z.number().optional(),
	hideLocation: z.boolean().optional(),
});

type LocationItem = z.output<typeof LocationFrontmatterSchema> & {
	path: string;
	reason: string;
};

export async function checkLocationsVisibility(locationsPath: string): Promise<boolean> {
	console.log(chalk.blue('Checking locations that should potentially be hidden...'));

	try {
		const locations = await parseContentFiles(locationsPath);
		const candidateLocations: Array<LocationItem> = [];

		for (const location of locations) {
			const frontmatter = LocationFrontmatterSchema.parse(location.frontmatter);
			const { status, safety, hideLocation } = frontmatter;

			// Skip if already hidden or demolished
			if (hideLocation === true || status === LocationStatusEnum.Demolished) {
				continue;
			}

			// Check if status is abandoned
			const isPotentiallyDangerous = isIncludedIn(status, [
				LocationStatusEnum.Abandoned,
				LocationStatusEnum.Idle,
				LocationStatusEnum.Remnants,
				LocationStatusEnum.Unknown,
			]);

			// Check if safety is less than 3 (including undefined/null)
			const isPotentiallyUnsafe = safety === undefined || safety < 3;

			if (isPotentiallyDangerous || isPotentiallyUnsafe) {
				let reason = '';

				if (isPotentiallyDangerous && isPotentiallyUnsafe) {
					reason = `status: ${status}; safety: ${String(safety ?? 'undefined')}`;
				} else if (safety !== undefined && safety < 3) {
					reason = `safety: ${String(safety)}`;
				}

				if (reason !== '') {
					candidateLocations.push({
						path: location.pathRelative,
						reason,
						status,
						safety,
						hideLocation,
					});
				}
			}
		}

		if (candidateLocations.length === 0) {
			console.log(chalk.green('✓ No locations found that should be hidden'));
			return true;
		}

		console.log(
			chalk.yellow(
				`Found ${String(candidateLocations.length)} location(s) that might need hideLocation: true:`,
			),
		);
		console.log('');

		for (const candidate of candidateLocations) {
			console.log(chalk.cyan(`  ${candidate.path}`));
			console.log(chalk.gray(`    Reason: ${candidate.reason}`));
			console.log('');
		}

		console.log(chalk.blue('Summary:'));
		console.log(chalk.blue(`  Total locations checked: ${String(locations.length)}`));
		console.log(
			chalk.yellow(`  Locations that might need hiding: ${String(candidateLocations.length)}`),
		);
		console.log('');
		console.log(
			chalk.gray('Note: This is a diagnostic tool. No corrections are made automatically.'),
		);

		return true;
	} catch (error) {
		console.error(chalk.red('Error checking hide locations:'), error);
		return false;
	}
}
