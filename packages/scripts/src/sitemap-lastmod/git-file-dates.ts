import { $ } from 'zx';

interface GitFileDatesOptions {
	// Directory to run git in (repo root or a subdirectory)
	cwd: string;
	// Limit the log to these paths (git pathspec)
	pathspec?: string | Array<string>;
	// Prepended to each key, to rebase paths onto a common root
	keyPrefix?: string;
	// Commit timestamp to record (default: committer)
	date?: 'committer' | 'author';
	// Behaviour on a shallow clone, where dates would be wrong (default: throw)
	onShallow?: 'throw' | 'warn' | 'ignore';
}

// Prefixes each date line so it can't be confused with a file path
const dateLineMarker = '\u{1}';

async function isShallowRepository(cwd: string): Promise<boolean> {
	const result = await $({ cwd })`git rev-parse --is-shallow-repository`;

	return result.stdout.trim() === 'true';
}

async function warnOrThrowOnShallow(cwd: string, onShallow: 'throw' | 'warn' | 'ignore') {
	if (onShallow === 'ignore' || !(await isShallowRepository(cwd))) return;

	const message =
		'Shallow clone detected: git history is truncated, so file dates will be missing or wrong. Fetch full history first (`git fetch --unshallow`, or checkout with fetch-depth 0).';

	if (onShallow === 'throw') throw new Error(message);

	console.warn(message);
}

function toPathspecArgs(pathspec: string | Array<string> | undefined): Array<string> {
	if (pathspec === undefined) return [];

	return Array.isArray(pathspec) ? pathspec : [pathspec];
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

// Keys are paths as git prints them, relative to the repo root (not `cwd`); use `keyPrefix` to rebase them
export async function getGitFileDates(options: GitFileDatesOptions): Promise<Map<string, string>> {
	const { cwd, pathspec, keyPrefix } = options;
	const dateFormat = options.date === 'author' ? '%aI' : '%cI';

	await warnOrThrowOnShallow(cwd, options.onShallow ?? 'throw');

	const pathspecArgs = toPathspecArgs(pathspec);

	const result = await $({
		cwd,
	})`git log --name-only --pretty=format:${dateLineMarker + dateFormat} -- ${pathspecArgs}`;

	return parseFileDates(result.stdout, keyPrefix);
}
