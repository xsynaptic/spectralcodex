#!/usr/bin/env tsx
import chalk from 'chalk';
import dotenv from 'dotenv';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { $ } from 'zx';

interface WarmOptions {
	rootPath: string;
	nginxUrl?: string;
	concurrency?: number;
	random?: boolean;
	dryRun?: boolean;
}

export async function warmCache(options: WarmOptions): Promise<void> {
	const { rootPath, nginxUrl = 'http://localhost:3100', concurrency = 2, random = false, dryRun = false } = options;

	dotenv.config({ path: path.join(rootPath, '.env') });
	dotenv.config({ path: path.join(rootPath, 'deploy/.env') });

	const remoteHost = process.env.DEPLOY_REMOTE_HOST;
	const sshKeyPath = process.env.DEPLOY_SSH_KEY_PATH;
	const remotePath = process.env.DEPLOY_REMOTE_PATH;

	if (!remoteHost || !sshKeyPath || !remotePath) {
		throw new Error('Missing DEPLOY_REMOTE_HOST, DEPLOY_SSH_KEY_PATH, or DEPLOY_REMOTE_PATH');
	}

	const manifestPath = `${remotePath}/cache-manifest.json`;

	try {
		await $`ssh-add --apple-load-keychain 2>/dev/null`;
	} catch {
		// Ignore
	}

	$.verbose = false;

	console.log(chalk.blue('Warming image cache...'));
	if (dryRun) console.log(chalk.yellow('  DRY RUN'));

	const sshArgs = ['-i', sshKeyPath, remoteHost];

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

// CLI entry point
if (process.argv[1]?.endsWith('warm.ts')) {
	const { values } = parseArgs({
		args: process.argv.slice(2),
		options: {
			'root-path': { type: 'string', default: process.cwd() },
			'nginx-url': { type: 'string', default: 'http://localhost:3100' },
			concurrency: { type: 'string', default: '2' },
			random: { type: 'boolean', default: false },
			'dry-run': { type: 'boolean', default: false },
		},
	});

	await warmCache({
		rootPath: values['root-path'],
		nginxUrl: values['nginx-url'],
		concurrency: Number(values.concurrency),
		random: values.random,
		dryRun: values['dry-run'],
	});
}
