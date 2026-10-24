import { loadDeployConfig } from '#deploy/deploy-config.ts';
import {
	getImageSet,
	getOpenGraphSet,
	pruneRemoteDerivatives,
	uploadDerivatives,
} from '#deploy/deploy-derivatives.ts';
import { ensureSshKeychain } from '#deploy/rsync-exec.ts';
import { defineCommand, runCommand } from '#shared/cli-command.ts';

await runCommand(
	defineCommand({
		interrupted: 'the server keeps every finished file, so the next run resumes',
		name: 'deploy-images',
		options: {
			'allow-mass-prune': {
				default: false,
				description: 'With --prune-remote, delete more than the safety limit allows',
				type: 'boolean',
			},
			'dry-run': { default: false, description: 'Show what rsync would do', type: 'boolean' },
			'prune-remote': {
				default: false,
				description: 'Delete remote files absent locally, after a typed confirmation',
				type: 'boolean',
			},
		},
		async run({ paths, signal, values }) {
			await ensureSshKeychain();

			const config = loadDeployConfig();
			const sets = [getImageSet(paths, config), getOpenGraphSet(paths, config)];

			for (const set of sets) {
				if (values['prune-remote']) {
					await pruneRemoteDerivatives(set, {
						config,
						dryRun: values['dry-run'],
						isMassPruneAllowed: values['allow-mass-prune'],
						signal,
					});
					continue;
				}

				await uploadDerivatives(set, { config, dryRun: values['dry-run'] });
			}
		},
		summary: 'Upload rendered images and OpenGraph images to the server, or prune remote orphans',
		title: 'Deploy images',
	}),
);
