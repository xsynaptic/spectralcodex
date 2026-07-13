import type { FileChangeQueueItem } from './types';

interface ChangeQueueOptions {
	debounceMs: number;
	processChange: (change: FileChangeQueueItem) => Promise<void>;
	onBatchStart: () => void | Promise<void>;
	onBatchEnd: () => void | Promise<void>;
	onError: (error: unknown, change?: FileChangeQueueItem) => void;
}

export function createChangeQueue({
	debounceMs,
	processChange,
	onBatchStart,
	onBatchEnd,
	onError,
}: ChangeQueueOptions) {
	const queue = new Map<string, FileChangeQueueItem>();

	let timeout: NodeJS.Timeout | undefined;

	// Chain batches so they never overlap; items queued mid-run wait for the next run
	let inFlight: Promise<void> = Promise.resolve();

	async function runBatch() {
		// Snapshot and clear synchronously so items queued during processing survive for the next batch
		const batch = [...queue.values()];

		queue.clear();

		if (batch.length === 0) return;

		try {
			await onBatchStart();

			// One failing item must not abort the rest of the batch
			for (const change of batch) {
				try {
					await processChange(change);
				} catch (error) {
					onError(error, change);
				}
			}

			await onBatchEnd();
		} catch (error) {
			onError(error);
		}
	}

	return {
		add(change: FileChangeQueueItem) {
			queue.set(change.filePath, change);

			if (timeout) clearTimeout(timeout);

			timeout = setTimeout(() => {
				// eslint-disable-next-line unicorn/prefer-await -- deliberate chaining; batches must serialize without awaiting inside the timer callback
				inFlight = inFlight.then(runBatch);
			}, debounceMs);
		},
	};
}
