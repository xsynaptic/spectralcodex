import { loadDeployConfig } from '#deploy/deploy-config.ts';
import { getImageSet, getOpenGraphSet, uploadDerivatives } from '#deploy/deploy-derivatives.ts';
import { ensureSshKeychain } from '#deploy/rsync-exec.ts';
import { defineCommand, runCommand } from '#shared/cli-command.ts';

await runCommand(
	defineCommand({
		interrupted: 'the server keeps every finished file, so the next run resumes',
		name: 'deploy-images',
		options: {
			'dry-run': { default: false, description: 'Show what rsync would do', type: 'boolean' },
		},
		async run({ paths, values }) {
			await ensureSshKeychain();

			const config = loadDeployConfig();

			for (const set of [getImageSet(paths, config), getOpenGraphSet(paths, config)]) {
				await uploadDerivatives(set, { config, dryRun: values['dry-run'] });
			}
		},
		summary: 'Upload rendered images and OpenGraph images to the server',
		title: 'Deploy images',
	}),
);
