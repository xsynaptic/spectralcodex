import { deployApp } from '#deploy/deploy-app.ts';
import { ensureSshKeychain } from '#deploy/rsync-exec.ts';
import { defineCommand, runCommand } from '#shared/command.ts';

await runCommand(
	defineCommand({
		name: 'deploy-app',
		options: {
			'dry-run': { default: false, description: 'Show what rsync would send', type: 'boolean' },
			'skip-delete': {
				default: false,
				description: 'Keep remote files missing from dist and skip asset retention',
				type: 'boolean',
			},
		},
		async run({ paths, values }) {
			await ensureSshKeychain();

			await deployApp({
				dryRun: values['dry-run'],
				rootPath: paths.rootPath,
				skipDelete: values['skip-delete'],
			});
		},
		summary: 'Transfer the built site in dist to the server',
		title: 'Deploy app',
	}),
);
