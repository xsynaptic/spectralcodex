import { $ } from 'zx';

interface GitFileDatesOptions {
	/** Directory to run git in (repo root or a subdirectory) */
	cwd: string;
	/** Limit the log to these paths (git pathspec) */
	pathspec?: string | Array<string>;
	/** Prepended to each key, to rebase paths onto a common root */
	keyPrefix?: string;
	/** Commit timestamp to record (default: committer) */
	date?: 'committer' | 'author';
	/** Behaviour on a shallow clone, where dates would be wrong (default: throw) */
	onShallow?: 'throw' | 'warn' | 'ignore';
}

// Prefixes each date line so it can't be confused with a file path
const DATE_LINE_MARKER = '\u0001';

async function isShallowRepository(cwd: string): Promise<boolean> {
	const result = await $({ cwd })`git rev-parse --is-shallow-repository`;

	return result.stdout.trim() === 'true';
}

/**
 * Map each git-tracked file to its most recent commit date
 * Keys are paths as git prints them, relative to the repo root (not `cwd`); use `keyPrefix` to rebase them
 */
export async function getGitFileDates(options: GitFileDatesOptions): Promise<Map<string, string>> {
	const { cwd, pathspec, keyPrefix } = options;
	const dateFormat = options.date === 'author' ? '%aI' : '%cI';
	const onShallow = options.onShallow ?? 'throw';

	if (onShallow !== 'ignore' && (await isShallowRepository(cwd))) {
		const message =
			'Shallow clone detected: git history is truncated, so file dates will be missing or wrong. Fetch full history first (`git fetch --unshallow`, or checkout with fetch-depth 0).';

		if (onShallow === 'throw') {
			throw new Error(message);
		}

		console.warn(message);
	}

	let pathspecArgs: Array<string> = [];

	if (Array.isArray(pathspec)) {
		pathspecArgs = pathspec;
	} else if (pathspec !== undefined) {
		pathspecArgs = [pathspec];
	}

	const result = await $({
		cwd,
	})`git log --name-only --pretty=format:${DATE_LINE_MARKER + dateFormat} -- ${pathspecArgs}`;

	const fileDates = new Map<string, string>();

	let currentDate = '';

	// Log is newest-first, so the first date seen for a file wins
	for (const line of result.stdout.split('\n')) {
		if (line.startsWith(DATE_LINE_MARKER)) {
			currentDate = line.slice(DATE_LINE_MARKER.length);
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
