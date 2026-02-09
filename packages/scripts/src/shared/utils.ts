import chalk from 'chalk';
import { existsSync, mkdirSync } from 'node:fs';
import fs from 'node:fs/promises';
import { $ } from 'zx';

export function safelyCreateDirectory(dir: string) {
	if (existsSync(dir)) return;

	mkdirSync(dir, { recursive: true });
	console.log(chalk.gray(`Created directory: ${chalk.cyan(dir)}`));
}

export async function fileExists(filePath: string) {
	try {
		await fs.access(filePath);
		return true;
	} catch {
		return false;
	}
}

export async function ensureSshKeychain() {
	try {
		await $`ssh-add --apple-load-keychain 2>/dev/null`;
	} catch {
		// Ignore - not on macOS or no keychain
	}
}
