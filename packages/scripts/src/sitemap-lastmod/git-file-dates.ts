import { $ } from 'zx';

import { log } from '#shared/cli-output.ts';

interface GitFileDatesOptions {
	cwd: string;
	date?: 'author' | 'committer';
	keyPrefix?: string;
	// A shallow clone would report wrong dates
	onShallow?: 'ignore' | 'throw' | 'warn';
	pathspec?: Array<string> | string;
}

// Prefixes each date line so it can't be confused with a file path
const dateLineMarker = '\u{1}';

// Keys are paths as git prints them, relative to the repo root (not `cwd`); use `keyPrefix` to rebase them
export async function getGitFileDates(options: GitFileDatesOptions): Promise<Map<string, string>> {
	const { cwd, keyPrefix, pathspec } = options;
	const dateFormat = options.date === 'author' ? '%aI' : '%cI';

	await warnOrThrowOnShallow(cwd, options.onShallow ?? 'throw');

	const pathspecArgs = toPathspecArgs(pathspec);

	const result = await $({
		cwd,
	})`git log --name-only --pretty=format:${dateLineMarker + dateFormat} -- ${pathspecArgs}`;

	return parseFileDates(result.stdout, keyPrefix);
}

async function isShallowRepository(cwd: string): Promise<boolean> {
	const result = await $({ cwd })`git rev-parse --is-shallow-repository`;

	return result.stdout.trim() === 'true';
}

function parseFileDates(stdout: string, keyPrefix: string | undefined): Map<string, string> {
	const fileDates = new Map<string, string>();

	let currentDate = '';

	// Log is newest-first, so the first date seen for a file wins
	for (const line of stdout.split('\n')) {
		if (line.startsWith(dateLineMarker)) {
			currentDate = line.slice(dateLineMarker.length);
			continue;
		}

		if (!line || !currentDate) continue;

		const key = keyPrefix ? `${keyPrefix}/${line}` : line;

		if (!fileDates.has(key)) {
			fileDates.set(key, currentDate);
		}
	}

	return fileDates;
}

function toPathspecArgs(pathspec: Array<string> | string | undefined): Array<string> {
	if (pathspec === undefined) return [];

	return Array.isArray(pathspec) ? pathspec : [pathspec];
}

async function warnOrThrowOnShallow(cwd: string, onShallow: 'ignore' | 'throw' | 'warn') {
	if (onShallow === 'ignore' || !(await isShallowRepository(cwd))) return;

	const message =
		'Shallow clone detected: git history is truncated, so file dates will be missing or wrong. Fetch full history first (`git fetch --unshallow`, or checkout with fetch-depth 0).';

	if (onShallow === 'throw') throw new Error(message);

	log.warn(message);
}
