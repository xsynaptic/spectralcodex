import chalk from 'chalk';
import fs from 'node:fs/promises';

export async function safelyCreateDirectory(dir: string) {
	try {
		await fs.access(dir);
	} catch {
		await fs.mkdir(dir, { recursive: true });

		console.log(chalk.gray(`Created directory: ${chalk.cyan(dir)}`));
	}
}
