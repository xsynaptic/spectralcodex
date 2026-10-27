import {
	openGraphBlurTreatment,
	OpenGraphCardTitlesSchema,
} from '@spectralcodex/shared/open-graph';
import { getCachePaths } from '@spectralcodex/shared/paths';
import { renderOpenGraphCards } from '@xsynaptic/astro-image-pipeline/node';
import { rmSync } from 'node:fs';

import type { ScriptPaths } from '#shared/cli-command.ts';

import { loadOpenGraphFonts } from '#og-image/fonts.ts';
import { createRenderer, processImage } from '#og-image/generate.ts';
import { templateVersion } from '#og-image/template-version.ts';
import { defineCommand, Refusal, runCommand } from '#shared/cli-command.ts';
import { formatCount, log } from '#shared/cli-output.ts';
import { createProgress, withSpinner } from '#shared/cli-progress.ts';

async function generateCards({
	isClearCache,
	paths,
	signal,
}: {
	isClearCache: boolean;
	paths: ScriptPaths;
	signal: AbortSignal;
}) {
	const { openGraphPath: outputPath, openGraphStatePath: statePath } = getCachePaths(
		paths.cachePath,
	);

	if (isClearCache) {
		rmSync(outputPath, { force: true, recursive: true });
		log.warn('Cleared OG image output');
	}

	const fonts = await withSpinner(
		'Loading fonts',
		loadOpenGraphFonts,
		(loaded) => `Loaded ${String(loaded.length)} font variants`,
	);
	const renderCard = createRenderer({ fonts });
	let progress: ReturnType<typeof createProgress> | undefined;
	let latest = { fresh: 0, rendered: 0 };

	const counts = await renderOpenGraphCards({
		cachePath: paths.cachePath,
		decode: (source) =>
			processImage({
				imageInput: source.path,
				isBlurred: source.treatment === openGraphBlurTreatment,
			}),
		directory: outputPath,
		onFailure: 'report',
		onProgress(update) {
			latest = update;
			progress =
				progress ??
				createProgress({
					label: 'Rendering',
					note: () =>
						`${formatCount(latest.rendered)} rendered, ${formatCount(latest.fresh)} cached`,
					total: update.total,
				});
			progress.tick();
		},
		render: (input, image) => renderCard(OpenGraphCardTitlesSchema.parse(input), image),
		signal,
		statePath,
		templateVersion,
	});

	if (counts.total === 0) {
		throw new Refusal('The last build recorded no OpenGraph cards; check getOpenGraphCardPath');
	}

	for (const { message, name } of counts.failures) log.error(`${name}: ${message}`);

	if (counts.failures.length > 0) {
		progress?.warn();
	} else {
		progress?.succeed();
	}

	log.summary([
		['Cards', counts.total],
		['Source images', counts.sources],
		['Rendered', counts.rendered],
		['Cached', counts.fresh],
		['Written', counts.written],
		['Errors', counts.failures.length],
	]);
	log.detail(`Output: ${outputPath}`);

	if (counts.failures.length > 0) {
		throw new Refusal(`${formatCount(counts.failures.length)} card(s) failed`);
	}
}

await runCommand(
	defineCommand({
		interrupted: 'finished cards are saved and the next run resumes',
		name: 'og-image',
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
		title: 'OpenGraph images',
	}),
);
