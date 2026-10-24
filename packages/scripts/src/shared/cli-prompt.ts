import { createInterface } from 'node:readline/promises';

import { pauseSpinner } from '#shared/cli-output.ts';

interface ConfirmPhraseOptions {
	message: string;
	phrase: string;
	signal: AbortSignal;
}

export async function isPhraseConfirmed({ message, phrase, signal }: ConfirmPhraseOptions) {
	if (!process.stdin.isTTY) return false;

	const pausedSpinner = pauseSpinner();
	const prompt = createInterface({ input: process.stdin, output: process.stderr });

	// Readline holds the terminal in raw mode, so Ctrl-C arrives here instead of as a signal
	prompt.on('SIGINT', () => {
		process.kill(process.pid, 'SIGINT');
	});

	try {
		const answer = await prompt.question(`${message} Type "${phrase}" to confirm: `, { signal });

		return answer.trim() === phrase;
	} finally {
		prompt.close();
		pausedSpinner?.start();
	}
}
