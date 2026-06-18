import chalk from 'chalk';
import pLimit from 'p-limit';

const USER_AGENT = 'SCXCacheWarmer/1.0 (+https://spectralcodex.com)';
const TIMEOUT_MS = 30_000;

const REQUEST_HEADERS: Record<string, string> = {
	'User-Agent': USER_AGENT,
	// Request brotli so we warm the same cached variant browsers receive
	'Accept-Encoding': 'br, gzip',
};

interface WarmCacheOptions {
	baseUrl?: string;
	concurrency?: number;
	limit?: number;
	dryRun?: boolean;
}

interface WarmResult {
	status: number | undefined;
	durationMs: number;
	error: string | undefined;
}

function extractLocations(xml: string): Array<string> {
	const locations: Array<string> = [];

	for (const match of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
		const location = match[1];

		if (location) locations.push(location);
	}

	return locations;
}

async function fetchText(url: string): Promise<string> {
	const response = await fetch(url, {
		headers: REQUEST_HEADERS,
		signal: AbortSignal.timeout(TIMEOUT_MS),
	});

	if (!response.ok) {
		throw new Error(`Could not fetch ${url}: HTTP ${String(response.status)}`);
	}

	return response.text();
}

async function getSitemapUrls(baseUrl: string): Promise<Array<string>> {
	const indexUrl = new URL('/sitemap-index.xml', baseUrl).href;
	const sitemapUrls = extractLocations(await fetchText(indexUrl));

	const urls: Array<string> = [];

	for (const sitemapUrl of sitemapUrls) {
		urls.push(...extractLocations(await fetchText(sitemapUrl)));
	}

	return urls;
}

/**
 * Request a single URL through the public hostname
 * Manual redirect handling captures the real 3xx status (a sitemap URL should resolve to 200)
 * The body is consumed so the edge serves the full response and the connection can be reused
 */
async function warmUrl(url: string): Promise<WarmResult> {
	const start = Date.now();

	try {
		const response = await fetch(url, {
			headers: REQUEST_HEADERS,
			redirect: 'manual',
			signal: AbortSignal.timeout(TIMEOUT_MS),
		});

		await response.arrayBuffer();

		return { status: response.status, durationMs: Date.now() - start, error: undefined };
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);

		return { status: undefined, durationMs: Date.now() - start, error: message };
	}
}

function formatStatus(status: number | undefined): string {
	if (status === undefined) return chalk.red('ERR');
	if (status === 200) return chalk.green('200');
	if (status >= 300 && status < 400) return chalk.yellow(String(status));

	return chalk.red(String(status));
}

export async function warmCache(options: WarmCacheOptions = {}): Promise<void> {
	const { concurrency = 12, limit, dryRun = false } = options;

	const baseUrl = options.baseUrl ?? process.env.PROD_SERVER_URL;

	if (!baseUrl) {
		console.log(chalk.yellow('Skipping cache warm: PROD_SERVER_URL not set'));
		return;
	}

	console.log(chalk.blue('Warming Cloudflare edge cache...'));

	const allUrls = await getSitemapUrls(baseUrl);
	const urls = limit ? allUrls.slice(0, limit) : allUrls;

	console.log(chalk.gray(`  ${String(urls.length)} URLs from sitemap`));

	if (dryRun) {
		console.log(chalk.yellow('  DRY RUN: no requests sent'));
		return;
	}

	const queue = pLimit(concurrency);
	const counts = new Map<string, number>();
	const failures: Array<string> = [];
	let completed = 0;

	const start = Date.now();

	await Promise.all(
		urls.map((url) =>
			queue(async () => {
				const result = await warmUrl(url);

				completed++;

				const label = result.status === undefined ? 'ERR' : String(result.status);
				counts.set(label, (counts.get(label) ?? 0) + 1);

				if (result.status !== 200) {
					const suffix = result.error ? ` (${result.error})` : '';
					failures.push(`  ${formatStatus(result.status)} ${url}${suffix}`);
				}

				console.log(
					`  [${String(completed)}/${String(urls.length)}] ${formatStatus(result.status)} ${chalk.gray(`${String(result.durationMs)}ms`)} ${url}`,
				);
			}),
		),
	);

	const durationSeconds = ((Date.now() - start) / 1000).toFixed(1);

	console.log(chalk.blue(`\nWarmed ${String(urls.length)} URLs in ${durationSeconds}s:`));

	const sortedCounts = [...counts].sort((first, second) => second[1] - first[1]);

	for (const [label, count] of sortedCounts) {
		console.log(`  ${label}: ${String(count)}`);
	}

	if (failures.length > 0) {
		console.log(chalk.yellow('Non-200 responses:'));
		console.log(failures.join('\n'));
	}
}
