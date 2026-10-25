import { promises as fs } from 'node:fs';
import path from 'node:path';

import { readFileIfExists } from '#files.ts';
import { Refusal } from '#refusal.ts';

const renderLockFile = 'render.lock';

async function didClaimLock(lockPath: string) {
	try {
		const handle = await fs.open(lockPath, 'wx');

		await handle.writeFile(String(process.pid));
		await handle.close();

		return true;
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'EEXIST') return false;

		throw error;
	}
}

function isProcessAlive(pid: number) {
	try {
		process.kill(pid, 0);

		return true;
	} catch (error) {
		return (error as NodeJS.ErrnoException).code !== 'ESRCH';
	}
}

async function readLockHolder(lockPath: string) {
	const data = await readFileIfExists(lockPath);
	const pid = Number(data?.toString('utf8').trim());

	return Number.isSafeInteger(pid) && pid > 0 ? pid : undefined;
}

async function acquireRenderLock(statePath: string) {
	const lockPath = path.join(statePath, renderLockFile);

	await fs.mkdir(statePath, { recursive: true });

	if (await didClaimLock(lockPath)) return lockPath;

	const holder = await readLockHolder(lockPath);

	if (holder !== undefined && isProcessAlive(holder)) {
		throw new Refusal(`Another render (pid ${String(holder)}) holds ${lockPath}`);
	}

	await fs.rm(lockPath, { force: true });

	if (await didClaimLock(lockPath)) return lockPath;

	throw new Refusal(`Another render took over the stale lock at ${lockPath}`);
}

export async function withRenderLock<Result>(statePath: string, run: () => Promise<Result>) {
	const lockPath = await acquireRenderLock(statePath);

	try {
		return await run();
	} finally {
		await fs.rm(lockPath, { force: true });
	}
}
