import { loadDeployConfig } from '#deploy/deploy-config.ts';
import { sshCaptureUnchecked } from '#deploy/rsync-exec.ts';
import { Refusal } from '#shared/cli-command.ts';
import { log } from '#shared/cli-output.ts';
import { withSpinner } from '#shared/cli-progress.ts';

interface InvokeCacheRefreshOptions {
	dryRun?: boolean;
}

// Fires the cache-warmer container detached so purge and warm outlive the deploy
// Image is built by deploy-infra; this only triggers a run
export async function invokeCacheRefresh(options: InvokeCacheRefreshOptions): Promise<void> {
	const { dryRun = false } = options;

	const config = loadDeployConfig();

	// Gracefully stop any prior run (SIGTERM for a clean exit), then free the name; latest deploy wins
	const command = `cd ${config.remotePath} && (docker stop cache-warmer-run 2>/dev/null; docker rm -f cache-warmer-run 2>/dev/null; true) && docker compose run -d --name cache-warmer-run cache-warmer`;

	if (dryRun) {
		log.warn(`Dry run; ssh: ${command}`);
		return;
	}

	await withSpinner(
		'Launching cache refresh',
		async () => {
			const result = await sshCaptureUnchecked(config, command);

			if (result.exitCode !== 0) {
				throw new Refusal(`Cache refresh failed to launch\n${result.stderr.trim()}`);
			}
		},
		() => 'Cache refresh launched',
	);

	log.detail(`Tail: ssh ${config.remoteHost} docker logs -f cache-warmer-run`);
}
