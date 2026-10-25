import {
	engineVersions,
	getImageCachePaths,
	renderImages,
} from '@xsynaptic/astro-image-pipeline/node';

import { defineCommand, runCommand } from '#shared/cli-command.ts';
import { log } from '#shared/cli-output.ts';
import { createProgress } from '#shared/cli-progress.ts';
import { createPurgeQueue } from '#shared/purge-queue.ts';

await runCommand(
	defineCommand({
		interrupted: 'progress is saved and the next run resumes',
		name: 'render-images',
		options: {
			'allow-mass-prune': {
				default: false,
				description: 'Prune more local images than the safety limit allows',
				type: 'boolean',
			},
		},
		async run({ paths, signal, values }) {
			const purgeQueue = await createPurgeQueue(getImageCachePaths(paths.cachePath).statePath);
			let progress: ReturnType<typeof createProgress> | undefined;

			const counts = await renderImages({
				cachePath: paths.cachePath,
				isMassPruneAllowed: values['allow-mass-prune'],
				onProgress({ total }) {
					if (!progress) progress = createProgress({ label: 'Rendering', total });

					progress.tick();
				},
				onReplace: (name) => purgeQueue.add(name),
				signal,
			});

			progress?.succeed();

			log.summary([
				['Images', counts.total],
				['Rendered', counts.encoded],
				['Fresh', counts.fresh],
				['Written', counts.written],
				['Overwritten', counts.overwritten],
				['Pruned', counts.pruned],
				['Purge queue', purgeQueue.size],
			]);

			if (counts.isEngineChanged) {
				log.warn(
					'The sharp build changed since the last run, so every image re-rendered; changed files upload and purge on the next deploy',
				);
			}
		},
		summary: 'Render the images the last build published, incrementally',
		title: `Render images (sharp ${engineVersions.sharp}, vips ${engineVersions.vips})`,
	}),
);
