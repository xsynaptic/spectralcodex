import { getPublicId } from '@spectralcodex/shared/entries';
import { getCachePaths } from '@spectralcodex/shared/paths';
import {
	checkComponentProps,
	checkComponentTargets,
	checkEntryIds,
	checkReferences,
	getCollectionEntries,
	parseNumberOption,
	runValidations,
	withAstroContent,
	withSpinner,
} from '@xsynaptic/astro-scripts';

import type { ScriptPaths } from '#shared/command.ts';

import { runCommand } from '#shared/command.ts';
import { validateFrontmatterLinks } from '#validate-content/frontmatter-links.ts';
import { validateImageAspectRatios } from '#validate-content/image-aspect-ratios.ts';
import { validateImageFeaturedInBody } from '#validate-content/image-featured-in-body.ts';
import { validateImageFeaturedLinks } from '#validate-content/image-featured-links.ts';
import { validateImageFeaturedMissing } from '#validate-content/image-featured-missing.ts';
import { validateImageReferences } from '#validate-content/images.ts';
import { validateLocationsCoordinates } from '#validate-content/locations-coordinates.ts';
import { validateLocationsDuplicates } from '#validate-content/locations-duplicates.ts';
import { validateLocationsOverlap } from '#validate-content/locations-overlap.ts';
import { validateLocationsPointTitles } from '#validate-content/locations-point-titles.ts';
import { validateLocationsRegions } from '#validate-content/locations-region.ts';
import { validateRegionsParents } from '#validate-content/regions-parent.ts';
import { validateSeriesItems } from '#validate-content/series-items.ts';
import { validateSourceIds } from '#validate-content/source-ids.ts';

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

const checkNames = [
	'entry-ids',
	'references',
	'mdx',
	'link-ids',
	'series-items',
	'source-ids',
	'frontmatter-links',
	'images',
	'image-aspect-ratios',
	'image-featured-in-body',
	'image-featured-links',
	'image-featured-missing',
	'location-duplicates',
	'location-point-titles',
	'location-regions',
	'location-overlap',
	'region-parents',
	'location-coordinates',
] as const;

function getChecks(
	{ allEntries, imageEntries }: Awaited<ReturnType<typeof loadEntries>>,
	{ paths, rootPath, threshold }: { paths: ScriptPaths; rootPath: string; threshold: number },
) {
	function entriesFrom(...collections: Array<string>) {
		return allEntries.filter((entry) => collections.includes(entry.collection));
	}

	const metadataEntries = entriesFrom('locations', 'pages', 'posts', 'regions', 'series', 'themes');
	const bodyContentEntries = entriesFrom('locations', 'posts');
	const resourceEntries = entriesFrom('resources');
	const locationEntries = entriesFrom('locations');

	return {
		'entry-ids': () =>
			checkEntryIds(allEntries, { getIds: (entry) => [entry.id, getPublicId(entry)] }),
		'frontmatter-links': () => validateFrontmatterLinks(allEntries, resourceEntries),
		'image-aspect-ratios': () => validateImageAspectRatios(imageEntries, { showStats: true }),
		'image-featured-in-body': () => validateImageFeaturedInBody(bodyContentEntries),
		'image-featured-links': () => validateImageFeaturedLinks(allEntries, metadataEntries),
		'image-featured-missing': () => validateImageFeaturedMissing(bodyContentEntries),
		images: () => validateImageReferences(allEntries, paths.mediaPath),
		'link-ids': () =>
			checkComponentTargets(allEntries, {
				component: 'Link',
				label: 'Link ID',
				prop: 'id',
				rootPath,
				targets: metadataEntries.map((entry) => entry.id),
			}),
		'location-coordinates': () =>
			validateLocationsCoordinates(
				locationEntries,
				entriesFrom('regions'),
				getCachePaths(paths.cachePath).divisionsPath,
			),
		'location-duplicates': () => validateLocationsDuplicates(locationEntries),
		'location-overlap': () => validateLocationsOverlap(locationEntries, threshold),
		'location-point-titles': () => validateLocationsPointTitles(locationEntries),
		'location-regions': () => validateLocationsRegions(locationEntries),
		mdx: () => checkComponentProps(allEntries, { required: { Img: 'src', Link: 'id' }, rootPath }),
		references: () => checkReferences(allEntries, { skipCollections: ['images'] }),
		'region-parents': () => validateRegionsParents(entriesFrom('regions')),
		'series-items': () => validateSeriesItems(entriesFrom('series'), metadataEntries),
		'source-ids': () => validateSourceIds(allEntries, resourceEntries),
	};
}

await runCommand({
	name: 'validate-content',
	options: {
		threshold: {
			default: '10',
			description: 'Distance in metres under which two Locations count as overlapping',
			type: 'string',
		},
	},
	positional: {
		choices: checkNames,
		description: 'Run one check by name; omit to run all',
		name: 'check',
	},
	async run({ paths, positionals, rootPath, values }) {
		const [checkName] = positionals;
		const entries = await withSpinner('Loading content', loadEntries);
		const checks = getChecks(entries, {
			paths,
			rootPath,
			threshold: parseNumberOption(values.threshold, 'threshold'),
		});

		// Subcommands are for inspection; only a full run gates deployment
		await runValidations(checkNames, checks, { only: checkName });
	},
	summary: 'Check content references, images, Locations and Regions before a build',
	title: 'Validate content',
});
