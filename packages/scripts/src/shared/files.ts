import { log } from '@xsynaptic/astro-scripts';
import { existsSync, mkdirSync } from 'node:fs';
import fs from 'node:fs/promises';

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
