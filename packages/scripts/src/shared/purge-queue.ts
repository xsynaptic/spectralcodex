import { formatCount, log, UserError, withSpinner } from '@xsynaptic/astro-scripts';
import { existsSync, promises as fs, rmSync } from 'node:fs';
import path from 'node:path';
import * as R from 'remeda';

export type PurgeRequestBody = { files: Array<string> } | { prefixes: Array<string> };

// Cloudflare's Free plan takes at most 100 URLs per purge call
const purgeBatchSize = 100;

// Past this many, one prefix purge beats dozens of batches; Free allows 5 prefix purges a minute
const prefixPurgeThreshold = 2000;

function getPurgePrefix(baseUrl: string) {
	const url = new URL(baseUrl);

	return `${url.host}${url.pathname.replace(/\/+$/, '')}`;
}

const heldLocks = new Set<string>();

function hasErrorCode(error: unknown, code: string) {
	return error instanceof Error && 'code' in error && error.code === code;
}

function isProcessAlive(pid: number) {
	try {
		process.kill(pid, 0);
		return true;
	} catch (error) {
		// EPERM is a live process owned by another user
		return hasErrorCode(error, 'EPERM');
	}
}

function releaseLocks() {
	for (const lockPath of heldLocks) rmSync(lockPath, { force: true });

	heldLocks.clear();
}

// Draining rewrites the queue from memory, so a second live run would erase the names the first appends
async function lockQueue(filePath: string) {
	const lockPath = `${filePath}.lock`;

	if (heldLocks.has(lockPath)) return;

	await fs.mkdir(path.dirname(filePath), { recursive: true });

	try {
		await fs.writeFile(lockPath, String(process.pid), { flag: 'wx' });
	} catch (error) {
		if (!hasErrorCode(error, 'EEXIST')) throw error;

		const holder = Number(await fs.readFile(lockPath, 'utf8'));

		if (holder !== process.pid && isProcessAlive(holder)) {
			throw new UserError(
				`Another run (pid ${String(holder)}) holds ${filePath}; let it finish first`,
			);
		}

		await fs.writeFile(lockPath, String(process.pid));
	}

	if (heldLocks.size === 0) process.once('exit', releaseLocks);

	heldLocks.add(lockPath);
}

// Appended before each overwrite lands, so a run killed after the rename still leaves the purge queued
export async function createPurgeQueue(filePath: string) {
	await lockQueue(filePath);

	const data = existsSync(filePath) ? await fs.readFile(filePath, 'utf8') : '';
	const queued = new Set(data.split('\n').filter(Boolean));

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
			const count = formatCount(names.length);

			if (dryRun) {
				log.warn(`Dry run; ${count} ${label} stay queued for purge`);
				return;
			}

			if (isPrefixPurge) {
				await withSpinner(
					`Purging ${prefix} for ${count} queued ${label}`,
					async () => {
						await request({ prefixes: [prefix] });
						await remove(names);
					},
					() => `Purged ${prefix} for ${count} queued ${label}`,
				);
				return;
			}

			await withSpinner(
				`Purging ${count} ${label}`,
				async () => {
					for (const batch of R.chunk(names, purgeBatchSize)) {
						await request({ files: batch.map((name) => `${baseUrl}/${name}`) });
						await remove(batch);
					}
				},
				() => `Purged ${count} ${label} from Cloudflare`,
			);
		},
		get size() {
			return queued.size;
		},
	};
}
