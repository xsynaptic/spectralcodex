import chalk from 'chalk';

import { loadDeployConfig } from './deploy-config.js';
import { sshExec } from './rsync-exec.js';

interface InvokeCacheRefreshOptions {
	dryRun?: boolean;
}

// Fires the cache-warmer container detached so purge and warm outlive the deploy
// Image is built by deploy-infra; this only triggers a run
export async function invokeCacheRefresh(options: InvokeCacheRefreshOptions): Promise<void> {
	const { dryRun = false } = options;

	const config = loadDeployConfig();

	console.log(chalk.blue('Firing cache refresh on server (detached)...'));

	// Gracefully stop any prior run (SIGTERM for a clean exit), then free the name; latest deploy wins
	const command = `cd ${config.remotePath} && (docker stop cache-warmer-run 2>/dev/null; docker rm -f cache-warmer-run 2>/dev/null; true) && docker compose run -d --name cache-warmer-run cache-warmer`;

	await sshExec(config, command, { dryRun });

	if (!dryRun) {
		console.log(chalk.green('Cache refresh launched'));
		console.log(chalk.gray(`  Tail: ssh ${config.remoteHost} docker logs -f cache-warmer-run`));
	}
}
