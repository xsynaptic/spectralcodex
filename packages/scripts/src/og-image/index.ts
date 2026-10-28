import {
	openGraphBlurTreatment,
	OpenGraphCardTitlesSchema,
} from '@spectralcodex/shared/open-graph';
import { getCachePaths } from '@spectralcodex/shared/paths';
import {
	getImageCachePaths,
	prepareOpenGraphCardRender,
} from '@xsynaptic/astro-image-pipeline/node';
import { createProgress, formatCount, log, UserError, withSpinner } from '@xsynaptic/astro-scripts';
import { rmSync } from 'node:fs';

import type { ScriptPaths } from '#shared/command.ts';

import { loadOpenGraphFonts } from '#og-image/fonts.ts';
import { createRenderer, processImage } from '#og-image/generate.ts';
import { templateVersion } from '#og-image/template-version.ts';
import { runCommand } from '#shared/command.ts';

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
	const { openGraphCardsPath: outputPath } = getImageCachePaths(imagesPath);

	if (isClearCache) {
		rmSync(outputPath, { force: true, recursive: true });
		log.warn('Cleared OpenGraph cards');
	}

	const fonts = await withSpinner(
		'Loading fonts',
		loadOpenGraphFonts,
		(loaded) => `Loaded ${String(loaded.length)} font variants`,
	);
	const renderCard = createRenderer({ fonts });
	const render = await prepareOpenGraphCardRender({
		cachePath: imagesPath,
		decode: (source) =>
			processImage({
				imageInput: source.filePath,
				isBlurred: source.treatment === openGraphBlurTreatment,
			}),
		distPath: paths.distPath,
		render: (input, image) => renderCard(OpenGraphCardTitlesSchema.parse(input), image),
		templateVersion,
	});

	if (render.total === 0) {
		throw new UserError('The last build recorded no OpenGraph cards; check getOpenGraphCardPath');
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

	log.summary([
		['Cards', counts.total],
		['Source images', render.sources],
		['Rendered', counts.rendered],
		['Cached', counts.fresh],
		['Written', counts.written],
		['Errors', counts.failures.length],
	]);
	log.detail(`Output: ${outputPath}`);

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
