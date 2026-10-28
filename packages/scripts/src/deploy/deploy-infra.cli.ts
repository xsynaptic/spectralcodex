import { deployInfra } from '#deploy/deploy-infra.ts';
import { ensureSshKeychain } from '#deploy/rsync-exec.ts';
import { runCommand } from '#shared/command.ts';

await runCommand({
	name: 'deploy-infra',
	options: {
		'dry-run': {
			default: false,
			description:
				'Validate the Caddy config on the server, sync with rsync --dry-run and skip the remote commands',
			type: 'boolean',
		},
	},
	async run({ rootPath, values }) {
		await ensureSshKeychain();
		await deployInfra({ dryRun: values['dry-run'], rootPath });
	},
	summary: 'Sync the compose stack and server env, then pull, build and recreate the containers',
	title: 'Deploy infrastructure',
});
