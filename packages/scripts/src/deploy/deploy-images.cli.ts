import { loadDeployConfig } from '#deploy/deploy-config.ts';
import { getOpenGraphSet, getRenditionSet, uploadRenderedSet } from '#deploy/deploy-images.ts';
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

			for (const set of [getRenditionSet(paths, config), getOpenGraphSet(paths, config)]) {
				await uploadRenderedSet(set, { config, dryRun: values['dry-run'] });
			}
		},
		summary: 'Upload renditions and OpenGraph cards to the server',
		title: 'Deploy images',
	}),
);
