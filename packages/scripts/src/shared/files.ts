import { existsSync, mkdirSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';

import { log } from '#shared/cli-output.ts';

export function safelyCreateDirectory(dir: string) {
	if (existsSync(dir)) return;

	mkdirSync(dir, { recursive: true });
	log.detail(`Created directory: ${dir}`);
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
