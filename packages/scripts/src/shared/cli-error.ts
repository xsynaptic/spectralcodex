import chalk from 'chalk';

export class Refusal extends Error {}

export function reportCliError(error: unknown, signal: AbortSignal, interruptedMessage: string) {
	if (signal.aborted) {
		console.log(chalk.yellow(interruptedMessage));
	} else if (error instanceof Refusal) {
		console.log(chalk.red(error.message));
	} else {
		throw error;
	}
	process.exitCode = 1;
}
