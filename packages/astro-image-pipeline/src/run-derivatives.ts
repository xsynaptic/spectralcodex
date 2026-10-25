import { availableParallelism } from 'node:os';
import pLimit from 'p-limit';

import { createFileCache } from '#file-cache.ts';
import { formatList } from '#format.ts';
import { withRenderLock } from '#render-lock.ts';

const saveInterval = 10_000;

export interface DerivativeJob {
	key: string;
	name: string;
	render: () => Promise<Uint8Array>;
}

interface DerivativeCounts {
	fresh: number;
	overwritten: number;
	rendered: number;
	written: number;
}

interface DerivativeFailure {
	message: string;
	name: string;
}

export interface DerivativeRunOptions {
	concurrency?: number;
	directory: string;
	jobs: ReadonlyArray<DerivativeJob>;
	onFailure?: 'report' | 'throw';
	onProgress?: (progress: DerivativeCounts & { done: number; total: number }) => void;
	onReplace?: (name: string) => Promise<void>;
	signal?: AbortSignal;
	statePath: string;
}

// sharp runs each job on a libuv thread, so jobs beyond the pool size would only queue
export function getDefaultConcurrency() {
	return Math.min(availableParallelism(), Number(process.env.UV_THREADPOOL_SIZE) || 4);
}

export function runDerivatives(options: DerivativeRunOptions) {
	return withRenderLock(options.statePath, () => runJobs(options));
}

async function runJobs({
	concurrency = getDefaultConcurrency(),
	directory,
	jobs,
	onFailure = 'throw',
	onProgress,
	onReplace,
	signal,
	statePath,
}: DerivativeRunOptions) {
	const counts: DerivativeCounts = { fresh: 0, overwritten: 0, rendered: 0, written: 0 };
	const cache = await createFileCache({
		directory,
		onReplace: async (name) => {
			counts.overwritten++;
			await onReplace?.(name);
		},
		statePath,
	});
	const limit = pLimit(concurrency);
	const saveLimit = pLimit(1);
	const save = () => saveLimit(() => cache.save());
	const failures: Array<DerivativeFailure> = [];
	let done = 0;
	let lastSave = Date.now();

	async function runJob(job: DerivativeJob) {
		if (cache.isFresh(job.name, job.key)) {
			counts.fresh++;
			return;
		}

		const data = await job.render();

		counts.rendered++;
		if (await cache.write(job.name, job.key, data)) counts.written++;
	}

	await Promise.all(
		jobs.map((job) =>
			limit(async () => {
				if (signal?.aborted) return;

				try {
					await runJob(job);
				} catch (error) {
					failures.push({
						message: error instanceof Error ? error.message : String(error),
						name: job.name,
					});
				}

				done++;
				onProgress?.({ ...counts, done, total: jobs.length });

				if (Date.now() - lastSave < saveInterval) return;

				lastSave = Date.now();
				await save();
			}),
		),
	);

	await save();
	signal?.throwIfAborted();

	const sortedFailures = failures.toSorted((first, second) =>
		first.name.localeCompare(second.name),
	);

	if (onFailure === 'throw' && sortedFailures.length > 0) {
		throw new Error(
			`${String(sortedFailures.length)} files failed to render:\n${formatList(sortedFailures.map(({ message, name }) => `${name}: ${message}`))}`,
		);
	}

	return { ...counts, failures: sortedFailures, total: jobs.length };
}
