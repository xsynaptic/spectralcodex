import type { Ora } from 'ora';

import chalk from 'chalk';
import ora from 'ora';

let activeSpinner: Ora | undefined;

const countFormat = new Intl.NumberFormat('en-CA');

const byteUnits = ['B', 'kB', 'MB', 'GB', 'TB'] as const;

export function formatCount(count: number) {
	return countFormat.format(count);
}

export function formatBytes(bytes: number) {
	let value = bytes;
	let unitIndex = 0;

	while (value >= 1000 && unitIndex < byteUnits.length - 1) {
		value /= 1000;
		unitIndex += 1;
	}

	const unit = byteUnits[unitIndex] ?? 'B';

	return unitIndex === 0 ? `${String(value)} ${unit}` : `${value.toFixed(1)} ${unit}`;
}

export function formatError(error: unknown) {
	return error instanceof Error ? error.message : String(error);
}

export function formatDuration(milliseconds: number) {
	const seconds = milliseconds / 1000;

	if (seconds < 60) return `${seconds.toFixed(1)}s`;

	const minutes = Math.floor(seconds / 60);
	const remainder = Math.round(seconds % 60);

	return `${String(minutes)}m ${String(remainder).padStart(2, '0')}s`;
}

function writeStatus(line: string) {
	if (!activeSpinner?.isSpinning) {
		console.error(line);
		return;
	}

	activeSpinner.clear();
	console.error(line);
	activeSpinner.render();
}

// Stdin stays cooked so the terminal still signals the whole process group on Ctrl-C, child processes included
export function startSpinner(text: string) {
	activeSpinner?.stop();
	activeSpinner = ora({ discardStdin: false, stream: process.stderr, text }).start();

	return activeSpinner;
}

export function endSpinner(spinner: Ora, symbol?: string, text?: string) {
	if (symbol === undefined) {
		spinner.stop();
	} else {
		spinner.stopAndPersist(text === undefined ? { symbol } : { symbol, text });
	}

	if (activeSpinner === spinner) activeSpinner = undefined;
}

export function stopActiveSpinner(symbol: string) {
	if (activeSpinner) endSpinner(activeSpinner, symbol);
}

export const symbols = {
	error: chalk.red('✗'),
	success: chalk.green('✓'),
	warn: chalk.yellow('⚠'),
} as const;

export const log = {
	data(line: string) {
		console.log(line);
	},
	detail(text: string) {
		writeStatus(chalk.gray(`  ${text}`));
	},
	error(text: string) {
		writeStatus(`${symbols.error} ${chalk.red(text)}`);
	},
	info(text: string) {
		writeStatus(text);
	},
	step(text: string) {
		writeStatus(chalk.blue(text));
	},
	success(text: string) {
		writeStatus(`${symbols.success} ${text}`);
	},
	summary(rows: Array<[label: string, value: number | string]>) {
		const width = Math.max(...rows.map(([label]) => label.length)) + 2;

		for (const [label, value] of rows) {
			const formatted = typeof value === 'number' ? formatCount(value) : value;

			writeStatus(`  ${chalk.gray(`${label}:`.padEnd(width))}${formatted}`);
		}
	},
	title(text: string) {
		writeStatus(chalk.magenta(`=== ${text} ===`));
	},
	warn(text: string) {
		writeStatus(`${symbols.warn} ${chalk.yellow(text)}`);
	},
};
