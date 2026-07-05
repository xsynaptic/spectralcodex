// Purge Cloudflare, then warm the edge via the public hostnames
// Requests must traverse Cloudflare to populate the edge
interface WarmResult {
	url: string;
	status: number;
	ms: number;
	error?: string;
}

interface PurgeResult {
	success: boolean;
	errors?: Array<{ message: string }>;
}

const SKIP_PURGE = process.env.SKIP_PURGE === '1' || process.env.SKIP_PURGE === 'true';
const SITE_URL = requireEnv('SITE_URL').replace(/\/$/, '');
const ZONE_ID = SKIP_PURGE ? '' : requireEnv('CLOUDFLARE_ZONE_ID');
const API_TOKEN = SKIP_PURGE ? '' : requireEnv('CLOUDFLARE_API_TOKEN');
const CONCURRENCY = Number(process.env.CACHE_WARM_CONCURRENCY ?? '8') || 8;
const WARM_LIMIT = process.env.WARM_LIMIT ? Number(process.env.WARM_LIMIT) : undefined;
const TIMEOUT_MS = 30_000;

const HEADERS: Record<string, string> = {
	'User-Agent': 'SCXCacheWarmer/1.0 (+https://spectralcodex.com)',
	// Request brotli so we warm the same compressed variant browsers receive
	'Accept-Encoding': 'br, gzip',
};

const IMAGE_RE = /https?:\/\/[^\s"'<>]+\.(?:jpe?g|png|webp|avif)(?:\?[^\s"'<>]*)?/gi;
const ASSET_RE = /\/_x\/[^\s"'<>()]+/g;

function requireEnv(name: string): string {
	const value = process.env[name];
	if (!value) {
		console.error(`Missing required env var: ${name}`);
		process.exit(1);
	}
	return value;
}

function messageOf(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

// Shared iterator across N runners; next() is synchronous so concurrent runners don't race
// Streaming (no retained results) keeps memory flat across thousands of pages
async function pool<Item>(
	items: Iterable<Item>,
	concurrency: number,
	worker: (item: Item) => Promise<void>,
): Promise<void> {
	const iterator = items[Symbol.iterator]();
	async function run(): Promise<void> {
		for (let next = iterator.next(); !next.done; next = iterator.next()) {
			await worker(next.value);
		}
	}
	await Promise.all(Array.from({ length: concurrency }, run));
}

function* chain<Item>(...iterables: Array<Iterable<Item>>): Generator<Item> {
	for (const iterable of iterables) yield* iterable;
}

async function fetchText(url: string): Promise<string> {
	const response = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(TIMEOUT_MS) });
	if (!response.ok) throw new Error(`HTTP ${String(response.status)} for ${url}`);
	return response.text();
}

function extractLocations(xml: string): Array<string> {
	const locations: Array<string> = [];
	for (const match of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
		if (match[1]) locations.push(match[1]);
	}
	return locations;
}

async function purge(): Promise<void> {
	console.log('Purging Cloudflare cache (purge_everything)...');
	const response = await fetch(
		`https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/purge_cache`,
		{
			method: 'POST',
			headers: { Authorization: `Bearer ${API_TOKEN}`, 'Content-Type': 'application/json' },
			body: JSON.stringify({ purge_everything: true }),
		},
	);
	const result = (await response.json().catch(() => ({
		success: false,
		errors: [{ message: 'unparseable response' }],
	}))) as PurgeResult;
	if (!response.ok || !result.success) {
		const messages = (result.errors ?? []).map((entry) => entry.message).join(', ');
		throw new Error(`Cloudflare purge failed (${String(response.status)}): ${messages}`);
	}
	console.log('Cache purged');
}

async function getSitemapUrls(): Promise<Array<string>> {
	const sitemaps = extractLocations(await fetchText(`${SITE_URL}/sitemap-index.xml`));
	const urls: Array<string> = [];
	for (const sitemap of sitemaps) urls.push(...extractLocations(await fetchText(sitemap)));
	return urls;
}

async function getMapUrls(): Promise<Array<string>> {
	try {
		const paths = JSON.parse(
			await fetchText(`${SITE_URL}/api/map/map-manifest.json`),
		) as Array<string>;
		return paths.map((path) => new URL(path, SITE_URL).href);
	} catch (error) {
		console.log(`Skipping map URLs: ${messageOf(error)}`);
		return [];
	}
}

// V8 keeps regex matches as slices that pin the whole source HTML; detach to save on memory
function detach(value: string): string {
	return Buffer.from(value).toString();
}

function scrape(html: string, assets: Set<string>): void {
	for (const match of html.matchAll(IMAGE_RE)) {
		if (match[0]) assets.add(detach(match[0]));
	}
	for (const match of html.matchAll(ASSET_RE)) {
		if (match[0]) assets.add(new URL(match[0], SITE_URL).href);
	}
}

async function warm(url: string, collect?: Set<string>): Promise<WarmResult> {
	const start = Date.now();
	try {
		const response = await fetch(url, {
			headers: HEADERS,
			redirect: 'manual',
			signal: AbortSignal.timeout(TIMEOUT_MS),
		});
		const contentType = response.headers.get('content-type') ?? '';
		if (collect && response.ok && contentType.includes('text/html')) {
			scrape(await response.text(), collect);
		} else {
			await response.arrayBuffer();
		}
		return { url, status: response.status, ms: Date.now() - start };
	} catch (error) {
		return { url, status: 0, ms: Date.now() - start, error: messageOf(error) };
	}
}

interface Stats {
	total: number;
	counts: Map<string, number>;
	failures: Array<string>;
}

function record(stats: Stats, result: WarmResult): void {
	stats.total++;
	const key = result.status === 0 ? 'ERR' : String(result.status);
	stats.counts.set(key, (stats.counts.get(key) ?? 0) + 1);
	if (result.status !== 200) {
		stats.failures.push(`  ${key} ${result.url}${result.error ? ` (${result.error})` : ''}`);
	}
}

async function warmAll(urls: Iterable<string>, collect?: Set<string>): Promise<Stats> {
	const stats: Stats = { total: 0, counts: new Map(), failures: [] };
	await pool(urls, CONCURRENCY, async (url) => {
		record(stats, await warm(url, collect));
	});
	return stats;
}

function report(label: string, stats: Stats): void {
	const summary = [...stats.counts]
		.sort((first, second) => second[1] - first[1])
		.map(([key, count]) => `${key}:${String(count)}`)
		.join(' ');
	console.log(`${label}: ${String(stats.total)} URLs (${summary})`);
	if (stats.failures.length) console.log(stats.failures.join('\n'));
}

async function main(): Promise<void> {
	const start = Date.now();

	if (SKIP_PURGE) console.log('SKIP_PURGE set: warming without purging');
	else await purge();

	let pages = await getSitemapUrls();
	if (WARM_LIMIT !== undefined) {
		pages = pages.slice(0, WARM_LIMIT);
		console.log(`WARM_LIMIT set: capping to ${String(WARM_LIMIT)} pages`);
	}
	console.log(`Warming ${String(pages.length)} pages (concurrency ${String(CONCURRENCY)})...`);
	const assets = new Set<string>();
	report('Pages', await warmAll(pages, assets));

	const mapUrls = await getMapUrls();
	console.log(
		`Warming ${String(assets.size)} images/assets + ${String(mapUrls.length)} map URLs...`,
	);
	report('Assets', await warmAll(chain(assets, mapUrls)));

	console.log(`Done in ${((Date.now() - start) / 1000).toFixed(1)}s`);
}

main().catch((error: unknown) => {
	console.error('Cache warm failed:', messageOf(error));
	process.exit(1);
});
