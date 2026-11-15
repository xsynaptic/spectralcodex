import type {
	OpenGraphCardTemplate,
	openGraphTemplateVariants,
	OpenGraphVariant,
} from '@spectralcodex/shared/open-graph';

import {
	getOpenGraphCardVariant,
	openGraphBlurTreatment,
	OpenGraphCardRecordSchema,
	openGraphDefaultVariant,
	openGraphVariants,
	resolveOpenGraphCardInput,
} from '@spectralcodex/shared/open-graph';
import { getCachePaths } from '@spectralcodex/shared/paths';
import { hashTemplateVersion, prepareCardRender } from '@xsynaptic/astro-image-pipeline/node';
import { createProgress, formatCount, log, UserError, withSpinner } from '@xsynaptic/astro-scripts';
import { readdirSync, rmSync } from 'node:fs';
import * as R from 'remeda';

import type { ScriptPaths } from '#shared/command.ts';

import { loadOpenGraphFonts } from '#og-image/fonts.ts';
import { createRenderer, decodeSource } from '#og-image/generate.ts';
import { runCommand } from '#shared/command.ts';

const templatesUrl = new URL('templates/', import.meta.url);

const baseTemplateFiles = ['index.tsx', 'shared.tsx'];

const variantTemplateFiles = {
	atlas: { landscape: 'atlas.tsx' },
	homepage: { landscape: 'homepage.tsx' },
	standard: {
		landscape: 'standard.tsx',
		portrait: 'standard-portrait.tsx',
		story: 'standard-story.tsx',
	},
} as const satisfies {
	[Template in OpenGraphCardTemplate]: Record<
		(typeof openGraphTemplateVariants)[Template][number],
		string
	>;
};

const mappedTemplateFiles = new Set([
	...baseTemplateFiles,
	...Object.values(variantTemplateFiles).flatMap((variants) => Object.values(variants)),
]);

const unmappedTemplateFiles = readdirSync(templatesUrl).filter(
	(file) => /\.tsx?$/.test(file) && !/\.test\.tsx?$/.test(file) && !mappedTemplateFiles.has(file),
);

// A template file missing from every hash would never re-render its cards when edited
if (unmappedTemplateFiles.length > 0) {
	throw new Error(
		`Map these files in baseTemplateFiles or variantTemplateFiles: ${unmappedTemplateFiles.join(', ')}`,
	);
}

// Font and pipeline bumps are left out on purpose; `--clear-cache` re-renders by hand when one shows
const baseTemplateVersion = hashTemplateVersion({
	files: [
		...baseTemplateFiles.map((file) => new URL(file, templatesUrl)),
		...['fonts.ts', 'generate.ts'].map((file) => new URL(file, import.meta.url)),
	],
	from: import.meta.url,
	packages: ['takumi-js'],
});

// Only this variant's size goes into the hash, so adding a variant leaves existing cards alone
const templateVersions = R.mapValues(variantTemplateFiles, (variants) =>
	R.mapValues(variants, (file, variant) =>
		hashTemplateVersion({
			files: [new URL(file, templatesUrl)],
			from: import.meta.url,
			parts: [baseTemplateVersion, JSON.stringify(openGraphVariants[variant])],
		}),
	),
);

function getTemplateVersion(input: unknown) {
	const { variant = openGraphDefaultVariant, ...card } = OpenGraphCardRecordSchema.parse(input);
	const { template } = resolveOpenGraphCardInput(card);
	const versions: Partial<Record<OpenGraphVariant, string>> = templateVersions[template];
	const version = versions[variant];

	if (version === undefined) throw new Error(`The ${template} template draws no ${variant} card`);

	return version;
}

async function generateCards({
	isClearCache,
	paths,
	signal,
}: {
	isClearCache: boolean;
	paths: ScriptPaths;
	signal: AbortSignal;
}) {
	const { imagesPath } = getCachePaths(paths.cachePath);

	const fonts = await withSpinner(
		'Loading fonts',
		loadOpenGraphFonts,
		(loaded) => `Loaded ${String(loaded.length)} font variants`,
	);
	const renderCard = createRenderer({ fonts });
	const render = await prepareCardRender({
		decode: (source) =>
			Promise.resolve(
				decodeSource({
					imageInput: source.filePath,
					isBlurred: source.treatment === openGraphBlurTreatment,
				}),
			),
		distPath: paths.distPath,
		render: (input, source) => renderCard(OpenGraphCardRecordSchema.parse(input), source),
		storePath: imagesPath,
		templateVersion: getTemplateVersion,
	});

	if (render.total === 0) {
		throw new UserError('The last build recorded no OpenGraph cards; check getOpenGraphCardPath');
	}

	if (isClearCache) {
		rmSync(render.directory, { force: true, recursive: true });
		log.warn('Cleared OpenGraph cards');
	}

	let latest = { fresh: 0, rendered: 0 };
	const progress = createProgress({
		label: 'Rendering',
		note: () => `${formatCount(latest.rendered)} rendered, ${formatCount(latest.fresh)} cached`,
		total: render.total,
	});

	const counts = await render.run({
		onFailure: 'report',
		onProgress: (update) => {
			latest = update;
			progress.tick();
		},
		signal,
	});

	for (const { message, name } of counts.failures) log.error(`${name}: ${message}`);

	if (counts.failures.length > 0) {
		progress.warn();
	} else {
		progress.succeed();
	}

	const variantRows = R.pipe(
		render.cards,
		R.countBy(getOpenGraphCardVariant),
		R.entries(),
		R.sortBy(([variant]) => variant),
		R.map(([variant, count]): [string, number] => [`${R.capitalize(variant)} cards`, count]),
	);

	log.summary([
		['Cards', counts.total],
		...variantRows,
		['Source images', render.sources],
		['Rendered', counts.rendered],
		['Cached', counts.fresh],
		['Written', counts.written],
		['Errors', counts.failures.length],
	]);
	log.detail(`Output: ${render.directory}`);

	if (counts.failures.length > 0) {
		throw new UserError(`${formatCount(counts.failures.length)} card(s) failed`);
	}
}

await runCommand({
	interrupted: 'finished cards are saved and the next run resumes',
	name: 'render-opengraph',
	options: {
		'clear-cache': {
			default: false,
			description: 'Delete every card and render from scratch',
			type: 'boolean',
		},
	},
	async run({ paths, signal, values }) {
		await generateCards({
			isClearCache: values['clear-cache'],
			paths,
			signal,
		});
	},
	summary: 'Render the OpenGraph cards the last build recorded, incrementally',
	title: 'Render OpenGraph cards',
});
