// Purge Cloudflare, then warm the edge via the public hostnames
// Requests must traverse Cloudflare to populate the edge
interface PurgeResult {
	errors?: Array<{ message: string }>;
	success: boolean;
}

interface WarmResult {
	error?: string;
	ms: number;
	status: number;
	url: string;
}

const shouldSkipPurge = process.env.SKIP_PURGE === '1' || process.env.SKIP_PURGE === 'true';
const siteUrl = requireEnv('SITE_URL').replace(/\/$/, '');
const cloudflareZoneId = shouldSkipPurge ? '' : requireEnv('CLOUDFLARE_ZONE_ID');
const cloudflareApiToken = shouldSkipPurge ? '' : requireEnv('CLOUDFLARE_API_TOKEN');
const defaultConcurrency = Number(process.env.CACHE_WARM_CONCURRENCY ?? '8') || 8;
const warmLimit = process.env.WARM_LIMIT ? Number(process.env.WARM_LIMIT) : undefined;

// Per-request timeout for warm, purge, and JMAP calls
const timeoutMs = 30_000;

// Alert email rides JMAP over HTTPS; outbound SMTP is blocked on the VPS
const jmapSessionUrl = requireEnv('JMAP_SESSION_URL');
const jmapApiToken = requireEnv('JMAP_API_TOKEN');
const alertEmailTo = requireEnv('ALERT_EMAIL_TO');
const alertEmailFrom = process.env.ALERT_EMAIL_FROM || alertEmailTo;
const shouldAlertAlways = process.env.ALERT_ALWAYS === '1' || process.env.ALERT_ALWAYS === 'true';
const alertMinFailures = Number(process.env.ALERT_MIN_FAILURES ?? '1') || 1;

// Cap the failure list in the email body
const maxAlertFailures = 50;

const jmapMailUrn = 'urn:ietf:params:jmap:mail';
const jmapSubmissionUrn = 'urn:ietf:params:jmap:submission';

const requestHeaders: Record<string, string> = {
	// Request brotli so we warm the same compressed variant browsers receive
	'Accept-Encoding': 'br, gzip',
	'User-Agent': 'SCXCacheWarmer/1.0 (+https://spectralcodex.com)',
};

// Site-relative build assets (CSS, JS, fonts) under the custom assets dir
const assetRegex = /\/_x\/[^\s"'<>()]+/g;

interface JmapIdentityList {
	list: Array<{ email: string; id: string }>;
}

type JmapInvocation = [name: string, args: unknown, callId: string];

interface JmapMailboxQuery {
	ids: Array<string>;
}

interface JmapSession {
	apiUrl: string;
	primaryAccounts: Record<string, string>;
}

interface JmapSetResult {
	created?: Record<string, { id: string }>;
	notCreated?: Record<string, unknown>;
}

interface MapUrlsResult {
	skipReason?: string;
	urls: Array<string>;
}

interface RunReport {
	failures: Array<WarmResult>;
	notes: Array<string>;
	phases: Array<[string, Stats]>;
	retriedCount: number;
	seconds: string;
	totalUrls: number;
}

interface Stats {
	counts: Map<string, number>;
	failures: Array<WarmResult>;
	total: number;
}

interface WarmAllOptions {
	collect?: Set<string>;
	concurrency?: number;
}

interface WarmRun {
	notes: Array<string>;
	phases: Array<[string, Stats]>;
	warmPhase: (label: string, urls: Iterable<string>, options?: WarmAllOptions) => Promise<Stats>;
}

function* chain<Item>(...iterables: Array<Iterable<Item>>): Generator<Item> {
	for (const iterable of iterables) yield* iterable;
}

function createWarmRun(): WarmRun {
	const phases: Array<[string, Stats]> = [];
	const notes: Array<string> = [];

	async function warmPhase(
		label: string,
		urls: Iterable<string>,
		options?: WarmAllOptions,
	): Promise<Stats> {
		const stats = await warmAll(urls, options);
		report(label, stats);
		phases.push([label, stats]);
		return stats;
	}

	return { notes, phases, warmPhase };
}

function extractLocations(xml: string): Array<string> {
	const locations: Array<string> = [];
	for (const match of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
		if (match[1]) locations.push(match[1]);
	}
	return locations;
}

function failureLine(result: WarmResult): string {
	const key = result.status === 0 ? 'ERR' : String(result.status);
	return `  ${key} ${result.url}${result.error ? ` (${result.error})` : ''}`;
}

async function fetchText(url: string): Promise<string> {
	const response = await fetch(url, {
		headers: requestHeaders,
		signal: AbortSignal.timeout(timeoutMs),
	});
	if (!response.ok) throw new Error(`HTTP ${String(response.status)} for ${url}`);
	return response.text();
}

function getBuildAssets(html: string): Set<string> {
	return new Set(html.match(assetRegex));
}

function getFailureLines(failures: Array<WarmResult>): Array<string> {
	if (failures.length === 0) return [];

	const lines = ['', ...failures.slice(0, maxAlertFailures).map(failureLine)];

	if (failures.length > maxAlertFailures) {
		lines.push(`  (+${String(failures.length - maxAlertFailures)} more)`);
	}

	return lines;
}

// A skipped manifest silently unwarms /api/map/*, so the reason must reach the run report
async function getMapUrls(): Promise<MapUrlsResult> {
	try {
		const paths = JSON.parse(
			await fetchText(`${siteUrl}/api/map/map-manifest.json`),
		) as Array<string>;
		return { urls: paths.map((path) => new URL(path, siteUrl).href) };
	} catch (error) {
		const skipReason = messageOf(error);
		console.log(`Skipping map URLs: ${skipReason}`);
		return { skipReason, urls: [] };
	}
}

function getReportBody(run: RunReport): string {
	const { failures, notes, phases, retriedCount, seconds, totalUrls } = run;

	const retryNote =
		retriedCount > 0
			? ` (${String(retriedCount)} retried, ${String(retriedCount - failures.length)} recovered)`
			: '';

	return [
		failures.length > 0
			? `${String(failures.length)} of ${String(totalUrls)} URLs failed to warm${retryNote}`
			: `All ${String(totalUrls)} URLs warmed${retryNote}`,
		'',
		...phases.map(([label, stats]) => summarize(label, stats)),
		...notes,
		...getFailureLines(failures),
		'',
		`Duration: ${seconds}s`,
	].join('\n');
}

function getReportSubject({ failures, notes, seconds, totalUrls }: RunReport): string {
	if (failures.length > 0) return `[SpectralCodex] cache warm: ${String(failures.length)} failed`;
	if (notes.length > 0) return '[SpectralCodex] cache warm: completed with warnings';

	return `[SpectralCodex] cache warm ok: ${String(totalUrls)} URLs in ${seconds}s`;
}

async function getSitemapUrls(): Promise<Array<string>> {
	const sitemaps = extractLocations(await fetchText(`${siteUrl}/sitemap-index.xml`));
	const urls: Array<string> = [];
	for (const sitemap of sitemaps) urls.push(...extractLocations(await fetchText(sitemap)));
	return urls;
}

// The edge misses on a query string it hasn't seen, and the origin ignores it, so this fetch gets the latest build
async function getStaleEdgeNote(): Promise<string | undefined> {
	try {
		const [edgeHtml, originHtml] = await Promise.all([
			fetchText(`${siteUrl}/`),
			fetchText(`${siteUrl}/?edge-check=${String(Date.now())}`),
		]);

		const edgeAssets = getBuildAssets(edgeHtml);
		const originAssets = getBuildAssets(originHtml);

		if (edgeAssets.size === originAssets.size && edgeAssets.isSubsetOf(originAssets)) return;

		return "The edge is still serving an older build of / than the origin. The purge didn't take, and maps can break until it's purged again";
	} catch (error) {
		return `Couldn't compare the edge's / with the origin's: ${messageOf(error)}`;
	}
}

// Notes (like a skipped map manifest) force the digest even on a clean run
function isReportWorthSending({ failures, notes }: RunReport): boolean {
	return shouldAlertAlways || notes.length > 0 || failures.length >= alertMinFailures;
}

async function jmapCall(
	apiUrl: string,
	methodCalls: Array<JmapInvocation>,
): Promise<Array<JmapInvocation>> {
	const result = (await jmapRequest(
		apiUrl,
		JSON.stringify({ methodCalls, using: [jmapMailUrn, jmapSubmissionUrn] }),
	)) as { methodResponses: Array<JmapInvocation> };
	return result.methodResponses;
}

async function jmapRequest(url: string, body?: string): Promise<unknown> {
	const init: RequestInit = {
		headers: {
			Authorization: `Bearer ${jmapApiToken}`,
			'Content-Type': 'application/json',
		},
		signal: AbortSignal.timeout(timeoutMs),
	};
	if (body !== undefined) {
		init.method = 'POST';
		init.body = body;
	}
	const response = await fetch(url, init);
	if (!response.ok) throw new Error(`JMAP HTTP ${String(response.status)} for ${url}`);
	return response.json();
}

function jmapResult(responses: Array<JmapInvocation>, callId: string): unknown {
	const match = responses.find((invocation) => invocation[2] === callId);
	if (!match) throw new Error(`JMAP response missing call ${callId}`);
	if (match[0] === 'error') throw new Error(`JMAP method error: ${JSON.stringify(match[1])}`);
	return match[1];
}

async function main(): Promise<void> {
	// A newer deploy sends SIGTERM to supersede this run; exit cleanly, not as a SIGKILL crash
	process.on('SIGTERM', () => {
		console.log('Superseded by a newer deploy; exiting');
		process.exit(0);
	});

	const start = Date.now();
	const run = createWarmRun();

	if (shouldSkipPurge) console.log('SKIP_PURGE set: warming without purging');
	else await purge();

	const assets = await warmPages(run);

	if (!shouldSkipPurge) {
		const staleEdgeNote = await getStaleEdgeNote();

		if (staleEdgeNote !== undefined) run.notes.push(staleEdgeNote);
	}

	await warmAssets(run, assets);

	// totalUrls is fixed first so retried URLs are not double-counted
	const totalUrls = run.phases.reduce((total, [, stats]) => total + stats.total, 0);
	const firstFailures = run.phases.flatMap(([, stats]) => stats.failures);
	const failures = await retryFailures(run, firstFailures);

	const seconds = ((Date.now() - start) / 1000).toFixed(1);
	console.log(`Done in ${seconds}s`);

	await sendRunReport({
		failures,
		notes: run.notes,
		phases: run.phases,
		retriedCount: firstFailures.length,
		seconds,
		totalUrls,
	});
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

async function purge(): Promise<void> {
	const host = new URL(siteUrl).host;
	console.log(`Purging Cloudflare cache (hostname ${host})...`);
	const response = await fetch(
		`https://api.cloudflare.com/client/v4/zones/${cloudflareZoneId}/purge_cache`,
		{
			body: JSON.stringify({ hosts: [host] }),
			headers: {
				Authorization: `Bearer ${cloudflareApiToken}`,
				'Content-Type': 'application/json',
			},
			method: 'POST',
			signal: AbortSignal.timeout(timeoutMs),
		},
	);
	let result: PurgeResult;
	try {
		result = (await response.json()) as PurgeResult;
	} catch {
		result = { errors: [{ message: 'unparseable response' }], success: false };
	}
	if (!response.ok || !result.success) {
		const messages = (result.errors ?? []).map((entry) => entry.message).join(', ');
		throw new Error(`Cloudflare purge failed (${String(response.status)}): ${messages}`);
	}
	console.log('Cache purged');
}

function record(stats: Stats, result: WarmResult): void {
	stats.total++;

	const key = result.status === 0 ? 'ERR' : String(result.status);

	stats.counts.set(key, (stats.counts.get(key) ?? 0) + 1);

	// Redirects are legitimate (moved pages, trailing slashes); only 4xx/5xx/network fail
	const isRedirect = result.status >= 300 && result.status < 400;

	if (!isRedirect && result.status !== 200) stats.failures.push(result);
}

function report(label: string, stats: Stats): void {
	console.log(summarize(label, stats));
	if (stats.failures.length > 0) console.log(stats.failures.map(failureLine).join('\n'));
}

function requireEnv(name: string): string {
	const value = process.env[name];
	if (!value) throw new Error(`Missing required env var: ${name}`);
	return value;
}

// One retry over everything that failed; most failures are transient origin pressure
async function retryFailures(
	run: WarmRun,
	failures: Array<WarmResult>,
): Promise<Array<WarmResult>> {
	if (failures.length === 0) return failures;

	console.log(`Retrying ${String(failures.length)} failed URLs...`);
	const retryStats = await run.warmPhase(
		'Retry',
		failures.map((failure) => failure.url),
	);
	return retryStats.failures;
}

// .href yields a fresh string, unpinning the source HTML that V8 would otherwise retain via a match slice
function scrape(text: string, assets: Set<string>): void {
	for (const match of text.matchAll(assetRegex)) {
		if (match[0]) assets.add(new URL(match[0], siteUrl).href);
	}
}

// Log-only on error; a broken alert must never crash or re-trigger the run
async function sendAlert(subject: string, text: string): Promise<void> {
	try {
		const session = (await jmapRequest(jmapSessionUrl)) as JmapSession;
		const accountId = session.primaryAccounts[jmapMailUrn];
		if (!accountId) throw new Error('token has no JMAP mail account');

		const lookup = await jmapCall(session.apiUrl, [
			['Identity/get', { accountId }, 'identities'],
			['Mailbox/query', { accountId, filter: { role: 'drafts' } }, 'drafts'],
		]);
		const identities = (jmapResult(lookup, 'identities') as JmapIdentityList).list;
		const identity = identities.find(
			(entry) => entry.email.toLowerCase() === alertEmailFrom.toLowerCase(),
		);
		if (!identity) throw new Error(`no sending identity for ${alertEmailFrom}`);
		const draftsMailboxId = (jmapResult(lookup, 'drafts') as JmapMailboxQuery).ids[0];
		if (!draftsMailboxId) throw new Error('no drafts mailbox');

		const send = await jmapCall(session.apiUrl, [
			[
				'Email/set',
				{
					accountId,
					create: {
						alert: {
							bodyValues: { body: { value: text } },
							from: [{ email: alertEmailFrom, name: 'Spectral Codex Cache Warmer Bot' }],
							keywords: { $draft: true },
							mailboxIds: { [draftsMailboxId]: true },
							subject,
							textBody: [{ partId: 'body', type: 'text/plain' }],
							to: [{ email: alertEmailTo }],
						},
					},
				},
				'create',
			],
			[
				'EmailSubmission/set',
				{
					accountId,
					create: { submit: { emailId: '#alert', identityId: identity.id } },
					onSuccessDestroyEmail: ['#submit'],
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

async function sendRunReport(run: RunReport): Promise<void> {
	if (run.failures.length > 0) process.exitCode = 2;
	if (!isReportWorthSending(run)) return;

	await sendAlert(getReportSubject(run), getReportBody(run));
}

function summarize(label: string, stats: Stats): string {
	const summary = [...stats.counts]
		.toSorted((first, second) => second[1] - first[1])
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

async function warm(url: string, collect?: Set<string>): Promise<WarmResult> {
	const start = Date.now();
	try {
		const response = await fetch(url, {
			headers: requestHeaders,
			redirect: 'manual',
			signal: AbortSignal.timeout(timeoutMs),
		});
		const contentType = response.headers.get('content-type') ?? '';
		const isScrapable = contentType.includes('text/html') || contentType.includes('text/css');
		if (collect && isScrapable && response.ok) {
			scrape(await response.text(), collect);
		} else {
			await response.arrayBuffer();
		}
		return { ms: Date.now() - start, status: response.status, url };
	} catch (error) {
		return { error: messageOf(error), ms: Date.now() - start, status: 0, url };
	}
}

async function warmAll(urls: Iterable<string>, options: WarmAllOptions = {}): Promise<Stats> {
	const stats: Stats = { counts: new Map(), failures: [], total: 0 };
	await pool(urls, options.concurrency ?? defaultConcurrency, async (url) => {
		record(stats, await warm(url, options.collect));
	});
	return stats;
}

async function warmAssets(run: WarmRun, assets: Set<string>): Promise<void> {
	const mapResult = await getMapUrls();
	if (mapResult.skipReason !== undefined) {
		run.notes.push(`Map URLs skipped: ${mapResult.skipReason}`);
	}
	console.log(
		`Warming ${String(assets.size)} assets + ${String(mapResult.urls.length)} map URLs...`,
	);
	// Fonts referenced from CSS only surface once the CSS itself is warmed
	const cssAssets = new Set<string>();
	await run.warmPhase('Assets', chain(assets, mapResult.urls), { collect: cssAssets });

	if (cssAssets.size > 0) {
		console.log(`Warming ${String(cssAssets.size)} CSS-referenced assets...`);
		await run.warmPhase('CSS assets', cssAssets);
	}
}

async function warmPages(run: WarmRun): Promise<Set<string>> {
	let pages = await getSitemapUrls();
	if (warmLimit !== undefined) {
		pages = pages.slice(0, warmLimit);
		console.log(`WARM_LIMIT set: capping to ${String(warmLimit)} pages`);
	}
	console.log(
		`Warming ${String(pages.length)} pages (concurrency ${String(defaultConcurrency)})...`,
	);
	const assets = new Set<string>();
	await run.warmPhase('Pages', pages, { collect: assets });
	return assets;
}

try {
	await main();
} catch (error) {
	console.error('Cache warm failed:', messageOf(error));
	await sendAlert('[SpectralCodex] cache warm crashed', messageOf(error));
	process.exitCode = 1;
}

export {};
