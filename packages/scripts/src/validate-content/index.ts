#!/usr/bin/env tsx
import chalk from 'chalk';
import path from 'node:path';
import { parseArgs } from 'node:util';

import type { ValidationResult } from '#validate-content/validation-result.ts';

import { getCollectionEntries, withAstroContent } from '#shared/astro-content.ts';
import { findWorkspaceRoot } from '#shared/utils.ts';
import { validateEntryIds } from '#validate-content/entry-ids.ts';
import { validateFrontmatterLinks } from '#validate-content/frontmatter-links.ts';
import { validateImageAspectRatios } from '#validate-content/image-aspect-ratios.ts';
import { validateImageFeaturedInBody } from '#validate-content/image-featured-in-body.ts';
import { validateImageFeaturedLinks } from '#validate-content/image-featured-links.ts';
import { validateImageFeaturedMissing } from '#validate-content/image-featured-missing.ts';
import { validateImageReferences } from '#validate-content/images.ts';
import { validateLinkIds } from '#validate-content/link-ids.ts';
import { validateLocationsCoordinates } from '#validate-content/locations-coordinates.ts';
import { validateLocationsDuplicates } from '#validate-content/locations-duplicates.ts';
import { validateLocationsOverlap } from '#validate-content/locations-overlap.ts';
import { validateLocationsRegions } from '#validate-content/locations-region.ts';
import { validateMdxComponents } from '#validate-content/mdx.ts';
import { validateReferences } from '#validate-content/references.ts';
import { validateRegionsParents } from '#validate-content/regions-parent.ts';
import { validateSeriesItems } from '#validate-content/series-items.ts';
import { validateSourceIds } from '#validate-content/source-ids.ts';
import { reportValidationResult } from '#validate-content/validation-result.ts';

const rootPath = findWorkspaceRoot();

const { positionals, values } = parseArgs({
	allowPositionals: true,
	args: process.argv.slice(2),
	options: {
		'divisions-path': {
			default: './public/divisions',
			type: 'string',
		},
		'media-path': {
			default: 'packages/content/media',
			type: 'string',
		},
		threshold: {
			default: '10',
			type: 'string',
		},
	},
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

// Names are the CLI subcommands
// Note: there is no need for a help command
const validations = [
	{ name: 'entry-ids', run: () => validateEntryIds(allEntries) },
	// Images load separately; the images check resolves them against the media directory
	{
		name: 'references',
		run: () => validateReferences(allEntries, { skipCollections: ['images'] }),
	},
	{ name: 'mdx', run: () => validateMdxComponents(allEntries, rootPath) },
	{ name: 'link-ids', run: () => validateLinkIds(allEntries, metadataEntries, rootPath) },
	{
		name: 'series-items',
		run: () => validateSeriesItems(entriesFrom('series'), metadataEntries),
	},
	{ name: 'source-ids', run: () => validateSourceIds(allEntries, resourceEntries) },
	{
		name: 'frontmatter-links',
		run: () => validateFrontmatterLinks(allEntries, resourceEntries),
	},
	{
		name: 'images',
		run: () => validateImageReferences(allEntries, path.join(rootPath, values['media-path'])),
	},
	{
		name: 'image-aspect-ratios',
		run: () => validateImageAspectRatios(imageEntries, { showStats: true }),
	},
	{
		name: 'image-featured-in-body',
		run: () => validateImageFeaturedInBody(bodyContentEntries),
	},
	{
		name: 'image-featured-links',
		run: () => validateImageFeaturedLinks(allEntries, metadataEntries),
	},
	{
		name: 'image-featured-missing',
		run: () => validateImageFeaturedMissing(bodyContentEntries),
	},
	{ name: 'location-duplicates', run: () => validateLocationsDuplicates(locationEntries) },
	{ name: 'location-regions', run: () => validateLocationsRegions(locationEntries) },
	{
		name: 'location-overlap',
		run: () => validateLocationsOverlap(locationEntries, Number(values.threshold)),
	},
	{ name: 'region-parents', run: () => validateRegionsParents(entriesFrom('regions')) },
	{
		name: 'location-coordinates',
		run: () =>
			validateLocationsCoordinates(locationEntries, path.join(rootPath, values['divisions-path'])),
	},
] satisfies Array<{ name: string; run: () => Promise<ValidationResult> | ValidationResult }>;

const selected = command
	? validations.filter((validation) => validation.name === command)
	: validations;

if (command && selected.length === 0) {
	console.log(chalk.red(`Unknown command: ${command}`));
	process.exit(1);
}

let hasFailure = false;

for (const validation of selected) {
	const result = await validation.run();

	reportValidationResult(result);

	if (result.status === 'fail') hasFailure = true;
}

// Subcommands are for inspection; only a full run gates deployment
if (!command && hasFailure) process.exit(1);
