import chalk from 'chalk';
import { existsSync, mkdirSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { $ } from 'zx';

export function safelyCreateDirectory(dir: string) {
	if (existsSync(dir)) return;

	mkdirSync(dir, { recursive: true });
	console.log(chalk.gray(`Created directory: ${chalk.cyan(dir)}`));
}

// Walk up the directory tree looking for `pnpm-workspace.yaml` to locate the monorepo root
// Cached at module load: scripts only ever run from one place per invocation
let cachedWorkspaceRoot: string | undefined;

export async function ensureSshKeychain() {
	try {
		await $`ssh-add --apple-load-keychain 2>/dev/null`;
	} catch {
		// Ignore - not on macOS or no keychain
	}
}

export function findWorkspaceRoot(startDir: string = process.cwd()): string {
	if (cachedWorkspaceRoot) return cachedWorkspaceRoot;

	let current = path.resolve(startDir);

	while (current !== path.dirname(current)) {
		if (existsSync(path.join(current, 'pnpm-workspace.yaml'))) {
			cachedWorkspaceRoot = current;
			return current;
		}

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

export function getLocalCachePath(rootPath: string) {
	return path.resolve(rootPath, process.env.CUSTOM_CACHE_PATH || '.cache');
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
