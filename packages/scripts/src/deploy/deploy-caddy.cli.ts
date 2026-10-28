import { deployCaddy } from '#deploy/deploy-caddy.ts';
import { loadDeployConfig } from '#deploy/deploy-config.ts';
import { ensureSshKeychain } from '#deploy/rsync-exec.ts';
import { verifyEdge } from '#deploy/verify-edge.ts';
import { runCommand } from '#shared/command.ts';

await runCommand({
	name: 'deploy-caddy',
	options: {
		'dry-run': {
			default: false,
			description: 'Validate and show what would change, without reloading',
			type: 'boolean',
		},
	},
	async run({ paths, rootPath, values }) {
		const isDryRun = values['dry-run'];

		await ensureSshKeychain();
		await deployCaddy({ dryRun: isDryRun, rootPath });

		if (!isDryRun) await verifyEdge({ config: loadDeployConfig(), paths });
	},
	summary: 'Validate, upload and reload the Caddy config, then verify the edge cache headers',
	title: 'Deploy Caddy',
});
