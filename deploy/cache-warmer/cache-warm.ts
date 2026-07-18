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

// Per-request timeout for warm, purge, and JMAP calls
const TIMEOUT_MS = 30_000;

// Alert email rides JMAP over HTTPS; outbound SMTP is blocked on the VPS
const JMAP_SESSION_URL = requireEnv('JMAP_SESSION_URL');
const JMAP_API_TOKEN = requireEnv('JMAP_API_TOKEN');
const ALERT_EMAIL_TO = requireEnv('ALERT_EMAIL_TO');
const ALERT_EMAIL_FROM = process.env.ALERT_EMAIL_FROM || ALERT_EMAIL_TO;
const ALERT_ALWAYS = process.env.ALERT_ALWAYS === '1' || process.env.ALERT_ALWAYS === 'true';
const ALERT_MIN_FAILURES = Number(process.env.ALERT_MIN_FAILURES ?? '1') || 1;

// Cap the failure list in the email body
const MAX_ALERT_FAILURES = 50;

const JMAP_MAIL_URN = 'urn:ietf:params:jmap:mail';
const JMAP_SUBMISSION_URN = 'urn:ietf:params:jmap:submission';

const HEADERS: Record<string, string> = {
	'User-Agent': 'SCXCacheWarmer/1.0 (+https://spectralcodex.com)',
	// Request brotli so we warm the same compressed variant browsers receive
	'Accept-Encoding': 'br, gzip',
};

// Site-relative build assets (CSS, JS, fonts) under the custom assets dir
const ASSET_REGEX = /\/_x\/[^\s"'<>()]+/g;

function requireEnv(name: string): string {
	const value = process.env[name];
	if (!value) throw new Error(`Missing required env var: ${name}`);
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
	// Image URLs are immutable (HMAC of the transform path, no content hash)
	// The purge is scoped to the site host; image server remains warm at the edge through a deploy
	const host = new URL(SITE_URL).host;
	console.log(`Purging Cloudflare cache (hostname ${host})...`);
	const response = await fetch(
		`https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/purge_cache`,
		{
			method: 'POST',
			headers: { Authorization: `Bearer ${API_TOKEN}`, 'Content-Type': 'application/json' },
			body: JSON.stringify({ hosts: [host] }),
			signal: AbortSignal.timeout(TIMEOUT_MS),
		},
	);
	let result: PurgeResult;
	try {
		result = (await response.json()) as PurgeResult;
	} catch {
		result = { success: false, errors: [{ message: 'unparseable response' }] };
	}
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

interface MapUrlsResult {
	urls: Array<string>;
	skipReason?: string;
}

// A skipped manifest silently unwarms /api/map/*, so the reason must reach the run report
async function getMapUrls(): Promise<MapUrlsResult> {
	try {
		const paths = JSON.parse(
			await fetchText(`${SITE_URL}/api/map/map-manifest.json`),
		) as Array<string>;
		return { urls: paths.map((path) => new URL(path, SITE_URL).href) };
	} catch (error) {
		const skipReason = messageOf(error);
		console.log(`Skipping map URLs: ${skipReason}`);
		return { urls: [], skipReason };
	}
}

function scrape(text: string, assets: Set<string>): void {
	// .href yields a fresh string, unpinning the source HTML that V8 would otherwise retain via a match slice
	for (const match of text.matchAll(ASSET_REGEX)) {
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
		const isScrapable = contentType.includes('text/html') || contentType.includes('text/css');
		if (collect && response.ok && isScrapable) {
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
	failures: Array<WarmResult>;
}

function record(stats: Stats, result: WarmResult): void {
	stats.total++;

	const key = result.status === 0 ? 'ERR' : String(result.status);

	stats.counts.set(key, (stats.counts.get(key) ?? 0) + 1);

	// Redirects are legitimate (moved pages, trailing slashes); only 4xx/5xx/network fail
	const isRedirect = result.status >= 300 && result.status < 400;

	if (result.status !== 200 && !isRedirect) stats.failures.push(result);
}

function failureLine(result: WarmResult): string {
	const key = result.status === 0 ? 'ERR' : String(result.status);
	return `  ${key} ${result.url}${result.error ? ` (${result.error})` : ''}`;
}

async function warmAll(urls: Iterable<string>, collect?: Set<string>): Promise<Stats> {
	const stats: Stats = { total: 0, counts: new Map(), failures: [] };
	await pool(urls, CONCURRENCY, async (url) => {
		record(stats, await warm(url, collect));
	});
	return stats;
}

function summarize(label: string, stats: Stats): string {
	const summary = [...stats.counts]
		.sort((first, second) => second[1] - first[1])
		.map(([key, count]) => {
			if (key === '200') return `${String(count)} ok`;
			if (key === 'ERR') return `${String(count)} network error`;
			const status = Number(key);
			if (status >= 300 && status < 400) return `${String(count)} redirected (HTTP ${key})`;
			return `${String(count)} HTTP ${key}`;
		})
		.join(', ');
	return `${label}: ${String(stats.total)} URLs (${summary})`;
}

function report(label: string, stats: Stats): void {
	console.log(summarize(label, stats));
	if (stats.failures.length > 0) console.log(stats.failures.map(failureLine).join('\n'));
}

interface JmapSession {
	apiUrl: string;
	primaryAccounts: Record<string, string>;
}

type JmapInvocation = [name: string, args: unknown, callId: string];

interface JmapIdentityList {
	list: Array<{ id: string; email: string }>;
}

interface JmapMailboxQuery {
	ids: Array<string>;
}

interface JmapSetResult {
	created?: Record<string, { id: string }>;
	notCreated?: Record<string, unknown>;
}

async function jmapRequest(url: string, body?: string): Promise<unknown> {
	const init: RequestInit = {
		headers: {
			Authorization: `Bearer ${JMAP_API_TOKEN}`,
			'Content-Type': 'application/json',
		},
		signal: AbortSignal.timeout(TIMEOUT_MS),
	};
	if (body !== undefined) {
		init.method = 'POST';
		init.body = body;
	}
	const response = await fetch(url, init);
	if (!response.ok) throw new Error(`JMAP HTTP ${String(response.status)} for ${url}`);
	return response.json();
}

async function jmapCall(
	apiUrl: string,
	methodCalls: Array<JmapInvocation>,
): Promise<Array<JmapInvocation>> {
	const result = (await jmapRequest(
		apiUrl,
		JSON.stringify({ using: [JMAP_MAIL_URN, JMAP_SUBMISSION_URN], methodCalls }),
	)) as { methodResponses: Array<JmapInvocation> };
	return result.methodResponses;
}

function jmapResult(responses: Array<JmapInvocation>, callId: string): unknown {
	const match = responses.find((invocation) => invocation[2] === callId);
	if (!match) throw new Error(`JMAP response missing call ${callId}`);
	if (match[0] === 'error') throw new Error(`JMAP method error: ${JSON.stringify(match[1])}`);
	return match[1];
}

// Log-only on error; a broken alert must never crash or re-trigger the run
async function sendAlert(subject: string, text: string): Promise<void> {
	try {
		const session = (await jmapRequest(JMAP_SESSION_URL)) as JmapSession;
		const accountId = session.primaryAccounts[JMAP_MAIL_URN];
		if (!accountId) throw new Error('token has no JMAP mail account');

		const lookup = await jmapCall(session.apiUrl, [
			['Identity/get', { accountId }, 'identities'],
			['Mailbox/query', { accountId, filter: { role: 'drafts' } }, 'drafts'],
		]);
		const identities = (jmapResult(lookup, 'identities') as JmapIdentityList).list;
		const identity = identities.find(
			(entry) => entry.email.toLowerCase() === ALERT_EMAIL_FROM.toLowerCase(),
		);
		if (!identity) throw new Error(`no sending identity for ${ALERT_EMAIL_FROM}`);
		const draftsMailboxId = (jmapResult(lookup, 'drafts') as JmapMailboxQuery).ids[0];
		if (!draftsMailboxId) throw new Error('no drafts mailbox');

		const send = await jmapCall(session.apiUrl, [
			[
				'Email/set',
				{
					accountId,
					create: {
						alert: {
							mailboxIds: { [draftsMailboxId]: true },
							keywords: { $draft: true },
							from: [{ name: 'Spectral Codex Cache Warmer Bot', email: ALERT_EMAIL_FROM }],
							to: [{ email: ALERT_EMAIL_TO }],
							subject,
							bodyValues: { body: { value: text } },
							textBody: [{ partId: 'body', type: 'text/plain' }],
						},
					},
				},
				'create',
			],
			[
				'EmailSubmission/set',
				{
					accountId,
					onSuccessDestroyEmail: ['#submit'],
					create: { submit: { emailId: '#alert', identityId: identity.id } },
				},
				'submit',
			],
		]);
		const submission = jmapResult(send, 'submit') as JmapSetResult;
		if (!submission.created?.submit) {
			throw new Error(`submission rejected: ${JSON.stringify(submission.notCreated ?? {})}`);
		}
		console.log(`Alert sent: ${subject}`);
	} catch (error) {
		console.error(`Alert send failed: ${messageOf(error)}`);
	}
}

interface RunReport {
	phases: Array<[string, Stats]>;
	failures: Array<WarmResult>;
	notes: Array<string>;
	retriedCount: number;
	totalUrls: number;
	seconds: string;
}

async function sendRunReport(run: RunReport): Promise<void> {
	const { phases, failures, notes, retriedCount, totalUrls, seconds } = run;

	if (failures.length > 0) process.exitCode = 2;
	// Notes (like a skipped map manifest) force the digest even on a clean run
	if (failures.length < ALERT_MIN_FAILURES && notes.length === 0 && !ALERT_ALWAYS) return;

	const hasFailures = failures.length > 0;
	const retryNote =
		retriedCount > 0
			? ` (${String(retriedCount)} retried, ${String(retriedCount - failures.length)} recovered)`
			: '';
	const failureLines = hasFailures
		? ['', ...failures.slice(0, MAX_ALERT_FAILURES).map(failureLine)]
		: [];
	if (failures.length > MAX_ALERT_FAILURES) {
		failureLines.push(`  (+${String(failures.length - MAX_ALERT_FAILURES)} more)`);
	}
	let subject = `[SpectralCodex] cache warm ok: ${String(totalUrls)} URLs in ${seconds}s`;
	if (hasFailures) {
		subject = `[SpectralCodex] cache warm: ${String(failures.length)} failed`;
	} else if (notes.length > 0) {
		subject = '[SpectralCodex] cache warm: completed with warnings';
	}
	const body = [
		hasFailures
			? `${String(failures.length)} of ${String(totalUrls)} URLs failed to warm${retryNote}`
			: `All ${String(totalUrls)} URLs warmed${retryNote}`,
		'',
		...phases.map(([label, stats]) => summarize(label, stats)),
		...notes,
		...failureLines,
		'',
		`Duration: ${seconds}s`,
	].join('\n');
	await sendAlert(subject, body);
}

async function main(): Promise<void> {
	// A newer deploy sends SIGTERM to supersede this run; exit cleanly, not as a SIGKILL crash
	process.on('SIGTERM', () => {
		console.log('Superseded by a newer deploy; exiting');
		process.exit(0);
	});

	const start = Date.now();
	const phases: Array<[string, Stats]> = [];

	if (SKIP_PURGE) console.log('SKIP_PURGE set: warming without purging');
	else await purge();

	let pages = await getSitemapUrls();
	if (WARM_LIMIT !== undefined) {
		pages = pages.slice(0, WARM_LIMIT);
		console.log(`WARM_LIMIT set: capping to ${String(WARM_LIMIT)} pages`);
	}
	console.log(`Warming ${String(pages.length)} pages (concurrency ${String(CONCURRENCY)})...`);
	const assets = new Set<string>();
	const pageStats = await warmAll(pages, assets);
	report('Pages', pageStats);
	phases.push(['Pages', pageStats]);

	const notes: Array<string> = [];
	const mapResult = await getMapUrls();
	if (mapResult.skipReason !== undefined) {
		notes.push(`Map URLs skipped: ${mapResult.skipReason}`);
	}
	console.log(
		`Warming ${String(assets.size)} assets + ${String(mapResult.urls.length)} map URLs...`,
	);
	// Fonts (and any images) referenced from CSS only surface once the CSS itself is warmed
	const cssAssets = new Set<string>();
	const assetStats = await warmAll(chain(assets, mapResult.urls), cssAssets);
	report('Assets', assetStats);
	phases.push(['Assets', assetStats]);

	if (cssAssets.size > 0) {
		console.log(`Warming ${String(cssAssets.size)} CSS-referenced assets...`);
		const cssStats = await warmAll(cssAssets);
		report('CSS assets', cssStats);
		phases.push(['CSS assets', cssStats]);
	}

	// One retry over everything that failed; most failures are transient origin pressure
	// totalUrls is fixed first so retried URLs are not double-counted
	const totalUrls = phases.reduce((total, [, stats]) => total + stats.total, 0);
	const firstFailures = phases.flatMap(([, stats]) => stats.failures);
	let failures = firstFailures;
	if (firstFailures.length > 0) {
		console.log(`Retrying ${String(firstFailures.length)} failed URLs...`);
		const retryStats = await warmAll(firstFailures.map((failure) => failure.url));
		report('Retry', retryStats);
		phases.push(['Retry', retryStats]);
		failures = retryStats.failures;
	}

	const seconds = ((Date.now() - start) / 1000).toFixed(1);
	console.log(`Done in ${seconds}s`);

	await sendRunReport({
		phases,
		failures,
		notes,
		retriedCount: firstFailures.length,
		totalUrls,
		seconds,
	});
}

try {
	await main();
} catch (error) {
	console.error('Cache warm failed:', messageOf(error));
	await sendAlert('[SpectralCodex] cache warm crashed', messageOf(error));
	process.exitCode = 1;
}

// Import-free file: keep it a module for top-level await
export {};
