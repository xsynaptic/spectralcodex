import { getCachePaths } from '@spectralcodex/shared/paths';

import type { ScriptPaths } from '#shared/cli-command.ts';
import type { ValidationResult } from '#validate-content/validation-result.ts';

import { getCollectionEntries, withAstroContent } from '#shared/astro-content.ts';
import { defineCommand, parseNumberOption, Refusal, runCommand } from '#shared/cli-command.ts';
import { withSpinner } from '#shared/cli-progress.ts';
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

async function loadEntries() {
	return withAstroContent(async (content) => ({
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
}

function getValidations(
	{ allEntries, imageEntries }: Awaited<ReturnType<typeof loadEntries>>,
	{ paths, threshold }: { paths: ScriptPaths; threshold: number },
) {
	function entriesFrom(...collections: Array<string>) {
		return allEntries.filter((entry) => collections.includes(entry.collection));
	}

	const metadataEntries = entriesFrom('locations', 'pages', 'posts', 'regions', 'series', 'themes');
	const bodyContentEntries = entriesFrom('locations', 'posts');
	const resourceEntries = entriesFrom('resources');
	const locationEntries = entriesFrom('locations');

	return [
		{ name: 'entry-ids', run: () => validateEntryIds(allEntries) },
		{
			name: 'references',
			run: () => validateReferences(allEntries, { skipCollections: ['images'] }),
		},
		{ name: 'mdx', run: () => validateMdxComponents(allEntries, paths.rootPath) },
		{ name: 'link-ids', run: () => validateLinkIds(allEntries, metadataEntries, paths.rootPath) },
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
			run: () => validateImageReferences(allEntries, paths.mediaPath),
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
			run: () => validateLocationsOverlap(locationEntries, threshold),
		},
		{ name: 'region-parents', run: () => validateRegionsParents(entriesFrom('regions')) },
		{
			name: 'location-coordinates',
			run: () =>
				validateLocationsCoordinates(
					locationEntries,
					entriesFrom('regions'),
					getCachePaths(paths.cachePath).divisionsPath,
				),
		},
	] satisfies Array<{ name: string; run: () => Promise<ValidationResult> | ValidationResult }>;
}

await runCommand(
	defineCommand({
		name: 'validate-content',
		options: {
			threshold: {
				default: '10',
				description: 'Distance in metres under which two Locations count as overlapping',
				type: 'string',
			},
		},
		positional: { description: 'Run one check by name; omit to run all', name: 'check' },
		async run({ paths, positionals, signal, values }) {
			const [checkName] = positionals;
			const entries = await withSpinner('Loading content', loadEntries);
			const validations = getValidations(entries, {
				paths,
				threshold: parseNumberOption(values.threshold, 'threshold'),
			});
			const selected = checkName
				? validations.filter((validation) => validation.name === checkName)
				: validations;

			if (checkName && selected.length === 0) {
				const names = validations.map((validation) => validation.name).join(', ');

				throw new Refusal(`Unknown check "${checkName}"; choose from ${names}`);
			}

			let failureCount = 0;

			for (const validation of selected) {
				signal.throwIfAborted();

				const result = await validation.run();

				reportValidationResult(result);

				if (result.status === 'fail') failureCount++;
			}

			// Subcommands are for inspection; only a full run gates deployment
			if (!checkName && failureCount > 0) {
				throw new Refusal(`${String(failureCount)} of ${String(selected.length)} checks failed`);
			}
		},
		summary: 'Check content references, images, Locations and Regions before a build',
		title: 'Validate content',
	}),
);
