import { getImageCachePaths } from '@spectralcodex/shared/images';
import { createSourceFingerprints } from '@spectralcodex/shared/source-fingerprint';

import { buildImages } from '#images/images-build.ts';
import { engineVersions } from '#images/images-state.ts';
import { defineCommand, runCommand } from '#shared/cli-command.ts';
import { log } from '#shared/cli-output.ts';
import { createProgress } from '#shared/cli-progress.ts';

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
			const { derivativesPath, statePath } = getImageCachePaths(paths.cachePath);
			let progress: ReturnType<typeof createProgress> | undefined;

			const counts = await buildImages({
				derivativesPath,
				distPath: paths.distPath,
				fingerprints: createSourceFingerprints(paths.cachePath),
				isMassPruneAllowed: values['allow-mass-prune'],
				mediaPath: paths.mediaPath,
				onProgress({ total }) {
					if (!progress) progress = createProgress({ label: 'Rendering', total });

					progress.tick();
				},
				signal,
				statePath,
			});

			progress?.succeed();

			log.summary([
				['Images', counts.total],
				['Rendered', counts.encoded],
				['Fresh', counts.fresh],
				['Written', counts.written],
				['Overwritten', counts.overwritten],
				['Pruned', counts.pruned],
				['Purge queue', counts.queued],
			]);

			if (counts.isEngineChanged) {
				log.warn(
					'The sharp build changed since the last run, so every image re-rendered; changed files upload and purge on the next deploy',
				);
			}
		},
		summary: 'Render the images the last build recorded, incrementally',
		title: `Render images (sharp ${engineVersions.sharp}, vips ${engineVersions.vips})`,
	}),
);
