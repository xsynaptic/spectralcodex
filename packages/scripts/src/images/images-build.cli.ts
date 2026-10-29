import { getCachePaths } from '@spectralcodex/shared/paths';
import { engineVersions, prepareRenditionRender } from '@xsynaptic/astro-image-pipeline/node';
import { createProgress, log } from '@xsynaptic/astro-scripts';

import { runCommand } from '#shared/command.ts';
import { createPurgeQueue } from '#shared/purge-queue.ts';

await runCommand({
	interrupted: 'progress is saved and the next run resumes',
	name: 'render-images',
	async run({ paths, signal }) {
		const { imagePurgeQueuePath, imagesPath } = getCachePaths(paths.cachePath);
		const purgeQueue = await createPurgeQueue(imagePurgeQueuePath);
		const render = await prepareRenditionRender({
			cachePath: imagesPath,
			distPath: paths.distPath,
		});
		const progress = createProgress({ label: 'Rendering', total: render.total });

		const counts = await render.run({
			onProgress: () => {
				progress.tick();
			},
			onReplace: (name) => purgeQueue.add(name),
			signal,
		});

		progress.succeed();

		log.summary([
			['Renditions', counts.total],
			['Rendered', counts.rendered],
			['Up to date', counts.fresh],
			['Written', counts.written],
			['Overwritten', counts.overwritten],
			['Purge queue', purgeQueue.size],
		]);
	},
	summary: 'Render the renditions the last build published, incrementally',
	title: `Render images (sharp ${engineVersions.sharp}, vips ${engineVersions.vips})`,
});
