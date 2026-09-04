#!/usr/bin/env tsx
import chalk from 'chalk';
import path from 'node:path';
import { parseArgs } from 'node:util';

import type { ValidationResult } from './validation-result';

import { getCollectionEntries, withAstroContent } from '../shared/astro-content.js';
import { findWorkspaceRoot } from '../shared/utils.js';
import { validateEntryIds } from './entry-ids';
import { validateFrontmatterLinks } from './frontmatter-links';
import { validateImageAspectRatios } from './image-aspect-ratios';
import { validateImageFeaturedInBody } from './image-featured-in-body';
import { validateImageFeaturedLinks } from './image-featured-links';
import { validateImageReferences } from './images';
import { validateLinkIds } from './link-ids';
import { validateLocationsCoordinates } from './locations-coordinates';
import { validateLocationsDuplicates } from './locations-duplicates';
import { validateLocationsOverlap } from './locations-overlap';
import { validateLocationsRegions } from './locations-region';
import { validateMdxComponents } from './mdx';
import { validateReferences } from './references';
import { validateRegionsParents } from './regions-parent';
import { validateSeriesItems } from './series-items';
import { validateSourceIds } from './source-ids';
import { reportValidationResult } from './validation-result';

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

const command = positionals[0];

const { allEntries, imageEntries } = await withAstroContent(async (content) => ({
	allEntries: await getCollectionEntries(content, [
		'chronology',
		'locations',
		'pages',
		'posts',
		'regions',
		'resources',
		'series',
		'themes',
	]),
	imageEntries: await getCollectionEntries(content, ['images']),
}));

function entriesFrom(...collections: Array<string>) {
	return allEntries.filter((entry) => collections.includes(entry.collection));
}

const metadataEntries = entriesFrom('locations', 'pages', 'posts', 'regions', 'series', 'themes');
const bodyContentEntries = entriesFrom('locations', 'posts');
const resourceEntries = entriesFrom('resources');
const locationEntries = entriesFrom('locations');

// Keys are the CLI subcommands; declaration order is the order a full run reports in
// Note: there is no need for a help command
const validations = {
	'entry-ids': () => validateEntryIds(allEntries),
	references: () => validateReferences(allEntries),
	mdx: () => validateMdxComponents(allEntries, rootPath),
	'link-ids': () => validateLinkIds(allEntries, metadataEntries, rootPath),
	'series-items': () => validateSeriesItems(entriesFrom('series'), metadataEntries),
	'source-ids': () => validateSourceIds(allEntries, resourceEntries),
	'frontmatter-links': () => validateFrontmatterLinks(allEntries, resourceEntries),
	images: () => validateImageReferences(allEntries, path.join(rootPath, values['media-path'])),
	'image-aspect-ratios': () => validateImageAspectRatios(imageEntries, { showStats: true }),
	'image-featured-in-body': () => validateImageFeaturedInBody(bodyContentEntries),
	'image-featured-links': () => validateImageFeaturedLinks(allEntries, metadataEntries),
	'location-duplicates': () => validateLocationsDuplicates(locationEntries),
	'location-regions': () => validateLocationsRegions(locationEntries),
	'location-overlap': () => validateLocationsOverlap(locationEntries, Number(values.threshold)),
	'region-parents': () => validateRegionsParents(entriesFrom('regions')),
	'location-coordinates': () =>
		validateLocationsCoordinates(locationEntries, path.join(rootPath, values['divisions-path'])),
} satisfies Record<string, () => Promise<ValidationResult> | ValidationResult>;

const selected = command
	? Object.entries(validations).filter(([name]) => name === command)
	: Object.entries(validations);

if (command && selected.length === 0) {
	console.log(chalk.red(`Unknown command: ${command}`));
	process.exit(1);
}

let hasFailure = false;

for (const [, validate] of selected) {
	const result = await validate();

	reportValidationResult(result);

	if (result.status === 'fail') hasFailure = true;
}

// Subcommands are for inspection; only a full run gates deployment
if (!command && hasFailure) process.exit(1);
