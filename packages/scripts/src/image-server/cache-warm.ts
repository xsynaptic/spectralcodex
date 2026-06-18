import chalk from 'chalk';
import { $ } from 'zx';

import { loadDeployConfig } from '../deploy/deploy-config.js';
import { ensureSshKeychain } from '../shared/utils.js';

interface CacheWarmOptions {
	rootPath: string;
	nginxUrl?: string;
	concurrency?: number;
	random?: boolean;
	dryRun?: boolean;
}

interface CacheWarmConfig {
	remoteHost: string;
	sshKeyPath?: string;
	sitePath: string;
	nginxUrl: string;
	concurrency: number;
	random: boolean;
	dryRun: boolean;
}

function loadCacheWarmConfig(options: CacheWarmOptions): CacheWarmConfig {
	const {
		nginxUrl = 'http://localhost:3100',
		concurrency = 4,
		random = false,
		dryRun = false,
	} = options;

	const { remoteHost, sshKeyPath, sitePath } = loadDeployConfig();

	return {
		remoteHost,
		...(sshKeyPath && sshKeyPath !== '' && { sshKeyPath }),
		sitePath,
		nginxUrl,
		concurrency,
		random,
		dryRun,
	};
}

async function runWarmScript(config: CacheWarmConfig, manifestFile: string): Promise<void> {
	const { remoteHost, sshKeyPath, sitePath, nginxUrl, concurrency, random, dryRun } = config;
	const manifestPath = `${sitePath}/${manifestFile}`;

	await ensureSshKeychain();

	$.verbose = false;

	const sshArgs = [...(sshKeyPath ? ['-i', sshKeyPath] : []), remoteHost];

	const remoteScript = dryRun
		? `
			if [ ! -f "${manifestPath}" ]; then
				echo "Error: Manifest not found at ${manifestPath}"
				exit 1
			fi
			COUNT=$(jq length "${manifestPath}")
			echo "Would be warming $COUNT URLs with concurrency ${String(concurrency)}"
		`
		: `
			if [ ! -f "${manifestPath}" ]; then
				echo "Error: Manifest not found at ${manifestPath}"
				exit 1
			fi

			COUNT=$(jq length "${manifestPath}")
			if [ "$COUNT" -eq 0 ]; then
				echo "No URLs to warm"
				exit 0
			fi

			echo "Warming $COUNT URLs with concurrency ${String(concurrency)}..."

			START=$(date +%s)
			DONE=0

			jq -r '.[]' "${manifestPath}"${random ? ' | shuf' : ''} | \\
				xargs -P ${String(concurrency)} -I {} sh -c '
					RESP=$(curl -s -D - -o /dev/null -w "%{http_code} %{time_total}s" "${nginxUrl}{}")
					CACHE=$(echo "$RESP" | grep -o "X-Cache-Status: [A-Z]*" | cut -d" " -f2)
					STATS=$(echo "$RESP" | tail -1)
					echo "$STATS $CACHE {}"
				'

			END=$(date +%s)
			DURATION=$((END - START))

			echo "Done in \${DURATION}s"
		`;

	await $({ stdio: 'inherit' })`ssh ${sshArgs} ${remoteScript}`;
}

export async function warmImageCache(options: CacheWarmOptions): Promise<void> {
	const config = loadCacheWarmConfig(options);

	console.log(chalk.blue('Warming image cache...'));
	if (config.dryRun) console.log(chalk.yellow('  DRY RUN'));

	await runWarmScript(config, 'cache-manifest.json');
}

export async function warmImageCacheNew(options: CacheWarmOptions): Promise<void> {
	const config = loadCacheWarmConfig(options);

	console.log(chalk.blue('Warming new image cache...'));
	if (config.dryRun) console.log(chalk.yellow('  DRY RUN'));

	await runWarmScript(config, 'cache-manifest-new.json');
}
