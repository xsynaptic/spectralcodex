import { promises as fs } from 'node:fs';
import path from 'node:path';
import * as R from 'remeda';

import { formatCount, log } from '#shared/cli-output.ts';
import { readFileIfExists } from '#shared/files.ts';

export type PurgeRequestBody = { files: Array<string> } | { prefixes: Array<string> };

const purgeQueueFile = 'purge-queue.txt';

// Cloudflare's Free plan takes at most 100 URLs per purge call
const purgeBatchSize = 100;

// Past this many, one prefix purge beats dozens of batches; Free allows 5 prefix purges a minute
const prefixPurgeThreshold = 2000;

function getPurgePrefix(baseUrl: string) {
	const url = new URL(baseUrl);

	return `${url.host}${url.pathname.replace(/\/+$/, '')}`;
}

// Appended before each overwrite lands, so a run killed after the rename still leaves the purge queued
export async function createPurgeQueue(statePath: string) {
	const filePath = path.join(statePath, purgeQueueFile);
	const data = await readFileIfExists(filePath);
	const queued = new Set(data?.toString('utf8').split('\n').filter(Boolean));

	async function remove(names: Iterable<string>) {
		for (const name of names) queued.delete(name);

		const temporary = `${filePath}.tmp`;

		await fs.writeFile(temporary, [...queued].map((name) => `${name}\n`).join(''));
		await fs.rename(temporary, filePath);
	}

	return {
		async add(name: string) {
			if (queued.has(name)) return;

			queued.add(name);
			await fs.mkdir(statePath, { recursive: true });
			await fs.appendFile(filePath, `${name}\n`);
		},
		async drain({
			baseUrl,
			dryRun = false,
			label,
			request,
		}: {
			baseUrl: string;
			dryRun?: boolean;
			label: string;
			request: (body: PurgeRequestBody) => Promise<void>;
		}) {
			const names = [...queued];

			if (names.length === 0) {
				log.detail(`No ${label} queued for purge`);
				return;
			}

			if (!URL.canParse(baseUrl)) {
				throw new Error(`The ${label} base URL must be absolute to purge, not ${baseUrl}`);
			}

			const prefix = getPurgePrefix(baseUrl);
			const isPrefixPurge = names.length > prefixPurgeThreshold;

			log.step(
				isPrefixPurge
					? `Purging ${prefix} for ${formatCount(names.length)} queued ${label}...`
					: `Purging ${formatCount(names.length)} ${label}...`,
			);

			if (dryRun) {
				log.warn('Dry run; the queue is kept');
				return;
			}

			if (isPrefixPurge) {
				await request({ prefixes: [prefix] });
				await remove(names);
				log.success('Purge done');
				return;
			}

			for (const batch of R.chunk(names, purgeBatchSize)) {
				await request({ files: batch.map((name) => `${baseUrl}/${name}`) });
				await remove(batch);
			}

			log.success('Purge done');
		},
		get size() {
			return queued.size;
		},
	};
}
