import chalk from 'chalk';
import * as R from 'remeda';

import { requireEnv } from '#deploy/deploy-config.ts';
import { createPurgeQueue } from '#shared/purge-queue.ts';

// Cloudflare Free: 100 URLs per single-file purge call
const purgeBatchSize = 100;

// Past this one prefix purge (5 per minute on Free) beats dozens of file batches
const prefixPurgeThreshold = 2000;

const requestTimeoutMs = 30_000;

interface CloudflarePurgeResult {
	errors?: Array<{ message: string }>;
	success: boolean;
}

async function readPurgeResult(response: Response): Promise<CloudflarePurgeResult> {
	try {
		return (await response.json()) as CloudflarePurgeResult;
	} catch {
		return { errors: [{ message: 'unparseable response' }], success: false };
	}
}

async function requestPurge(body: { files: Array<string> } | { prefixes: Array<string> }) {
	const response = await fetch(
		`https://api.cloudflare.com/client/v4/zones/${requireEnv('CLOUDFLARE_ZONE_ID')}/purge_cache`,
		{
			body: JSON.stringify(body),
			headers: {
				Authorization: `Bearer ${requireEnv('CLOUDFLARE_API_TOKEN')}`,
				'Content-Type': 'application/json',
			},
			method: 'POST',
			signal: AbortSignal.timeout(requestTimeoutMs),
		},
	);
	const result = await readPurgeResult(response);

	if (response.ok && result.success) return;

	const messages = (result.errors ?? []).map((error) => error.message).join(', ');

	throw new Error(`Cloudflare purge failed (${String(response.status)}): ${messages}`);
}

function getPurgePrefix(baseUrl: string) {
	const url = new URL(baseUrl);

	return `${url.host}${url.pathname.replace(/\/+$/, '')}`;
}

export async function purgeQueuedFiles({
	baseUrl,
	dryRun = false,
	label,
	statePath,
}: {
	baseUrl: string;
	dryRun?: boolean;
	label: string;
	statePath: string;
}) {
	const queue = await createPurgeQueue(statePath);
	const names = [...queue.queued];

	if (names.length === 0) {
		console.log(chalk.gray(`No ${label} queued for purge`));
		return;
	}

	if (!URL.canParse(baseUrl)) {
		throw new Error(`The ${label} base URL must be absolute to purge, not ${baseUrl}`);
	}

	const prefix = getPurgePrefix(baseUrl);
	const isPrefixPurge = names.length > prefixPurgeThreshold;

	console.log(
		chalk.blue(
			isPrefixPurge
				? `Purging ${prefix} for ${String(names.length)} queued ${label}...`
				: `Purging ${String(names.length)} ${label}...`,
		),
	);

	if (dryRun) {
		console.log(chalk.yellow('  DRY RUN; the queue is kept'));
		return;
	}

	if (isPrefixPurge) {
		await requestPurge({ prefixes: [prefix] });
		await queue.remove(names);
		console.log(chalk.green('Purge done'));
		return;
	}

	for (const batch of R.chunk(names, purgeBatchSize)) {
		await requestPurge({ files: batch.map((name) => `${baseUrl}/${name}`) });
		await queue.remove(batch);
	}

	console.log(chalk.green('Purge done'));
}
