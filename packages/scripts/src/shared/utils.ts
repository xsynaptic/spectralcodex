import chalk from 'chalk';
import { existsSync, mkdirSync } from 'node:fs';

export function safelyCreateDirectory(dir: string) {
	if (existsSync(dir)) return;

	mkdirSync(dir, { recursive: true });
	console.log(chalk.gray(`Created directory: ${chalk.cyan(dir)}`));
}
