import { existsSync, mkdirSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { $ } from 'zx';

import { log } from '#shared/cli-output.ts';

export function safelyCreateDirectory(dir: string) {
	if (existsSync(dir)) return;

	mkdirSync(dir, { recursive: true });
	log.detail(`Created directory: ${dir}`);
}

export async function ensureSshKeychain() {
	try {
		await $`ssh-add --apple-load-keychain 2>/dev/null`;
	} catch {
		// Not on macOS, or no keychain
	}
}

export function findWorkspaceRoot(startDir: string = process.cwd()): string {
	let current = path.resolve(startDir);

	while (current !== path.dirname(current)) {
		if (existsSync(path.join(current, 'pnpm-workspace.yaml'))) return current;

		current = path.dirname(current);
	}

	throw new Error(`Could not locate pnpm-workspace.yaml above ${startDir}`);
}

export async function isExistingFile(filePath: string) {
	try {
		await fs.access(filePath);
		return true;
	} catch {
		return false;
	}
}

export async function readFileIfExists(filePath: string) {
	try {
		return await fs.readFile(filePath);
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;

		throw error;
	}
}

export async function readJsonFile<Value>(filePath: string) {
	const data = await readFileIfExists(filePath);

	return data ? (JSON.parse(data.toString('utf8')) as Value) : undefined;
}

export async function writeJsonFile(filePath: string, value: unknown, space?: number) {
	const temporary = `${filePath}.tmp`;

	await fs.mkdir(path.dirname(filePath), { recursive: true });
	await fs.writeFile(temporary, `${JSON.stringify(value, undefined, space)}\n`);
	await fs.rename(temporary, filePath);
}

export function sortRecord<Value>(entries: Iterable<[string, Value]>) {
	return Object.fromEntries(
		[...entries].toSorted(([first], [second]) => first.localeCompare(second)),
	);
}
