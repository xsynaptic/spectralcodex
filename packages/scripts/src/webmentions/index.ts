import type { Webmention } from '@spectralcodex/shared/schemas';

import { getWebmentionsPath } from '@spectralcodex/shared/paths';
import { WebmentionSchema } from '@spectralcodex/shared/schemas';
import { formatCount, log, withSpinner } from '@xsynaptic/astro-scripts';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sanitizeHtml from 'sanitize-html';

import { runCommand } from '#shared/command.ts';
import { isExistingFile, safelyCreateDirectory } from '#shared/files.ts';

const apiUrl = 'https://webmention.io/api/mentions.jf2';
const userAgent = 'SpectralCodex-Webmentions/1.0 (+https://spectralcodex.com)';
const timeoutMs = 30_000;
const perPage = 1000;

// Markup is stored clean so a future rich renderer needs no refetch
const sanitizeOptions = {
	allowedAttributes: { a: ['href'] },
	allowedSchemes: ['http', 'https', 'mailto'],
	allowedTags: ['a', 'b', 'blockquote', 'br', 'code', 'em', 'i', 'p', 'pre', 'strong'],
} satisfies sanitizeHtml.IOptions;

interface FetchContext {
	domain: string;
	signal: AbortSignal;
	token: string;
}

// The feature is env-gated, so absent credentials are a clean skip rather than a failure
function loadCredentials() {
	const domain = process.env.WEBMENTION_DOMAIN;
	const token = process.env.WEBMENTION_API_KEY;

	if (domain && token) return { domain, token };

	const missing = [
		...(domain ? [] : ['WEBMENTION_DOMAIN']),
		...(token ? [] : ['WEBMENTION_API_KEY']),
	];

	log.warn(`Skipping webmentions; missing ${missing.join(', ')}`);

	return;
}

async function fetchMentionsPage(
	{ domain, signal, token }: FetchContext,
	{ page, sinceId }: { page: number; sinceId: number | undefined },
) {
	const url = new URL(apiUrl);

	url.searchParams.set('domain', domain);
	url.searchParams.set('token', token);
	url.searchParams.set('per-page', String(perPage));
	url.searchParams.set('page', String(page));
	url.searchParams.set('sort-by', 'created');
	url.searchParams.set('sort-dir', 'up');

	if (sinceId !== undefined) url.searchParams.set('since_id', String(sinceId));

	const response = await fetch(url, {
		headers: { Accept: 'application/json', 'User-Agent': userAgent },
		signal: AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)]),
	});

	if (!response.ok) {
		throw new Error(`webmention.io responded ${String(response.status)} for page ${String(page)}`);
	}

	const body = (await response.json()) as { children?: Array<unknown> };

	return body.children ?? [];
}

function getMaxMentionId(mentions: Map<number, Webmention>) {
	let maxId: number | undefined;

	for (const mentionId of mentions.keys()) {
		if (maxId === undefined || mentionId > maxId) maxId = mentionId;
	}

	return maxId;
}

function parseMention(line: string) {
	try {
		const result = WebmentionSchema.safeParse(JSON.parse(line));

		return result.success ? result.data : undefined;
	} catch {
		return;
	}
}

async function readExistingMentions(outputPath: string) {
	const mentions = new Map<number, Webmention>();

	if (!(await isExistingFile(outputPath))) return mentions;

	const fileContents = await readFile(outputPath, 'utf8');

	for (const line of fileContents.split('\n')) {
		if (line.trim() === '') continue;

		const result = parseMention(line);

		if (!result) {
			log.warn(`Discarding unreadable line in ${outputPath}`);
			continue;
		}

		mentions.set(result['wm-id'], result);
	}

	return mentions;
}

function sanitizeMention(mention: Webmention): Webmention {
	const html = mention.content?.html;

	if (!html) return mention;

	return {
		...mention,
		content: { ...mention.content, html: sanitizeHtml(html, sanitizeOptions) },
	};
}

async function fetchNewMentions(context: FetchContext, sinceId: number | undefined) {
	const mentions: Array<Webmention> = [];
	let invalidCount = 0;
	let privateCount = 0;

	for (let page = 0; ; page++) {
		const items = await fetchMentionsPage(context, { page, sinceId });

		for (const item of items) {
			const result = WebmentionSchema.safeParse(item);

			if (!result.success) {
				invalidCount += 1;
				continue;
			}

			if (result.data['wm-private']) {
				privateCount += 1;
				continue;
			}

			mentions.push(sanitizeMention(result.data));
		}

		if (items.length < perPage) break;
	}

	return { invalidCount, mentions, privateCount };
}

await runCommand({
	name: 'webmentions',
	async run({ paths, signal }) {
		const credentials = loadCredentials();

		if (!credentials) return;

		const outputPath = getWebmentionsPath(paths.contentDataPath);
		const outputDirectory = path.dirname(outputPath);

		const existingMentions = await readExistingMentions(outputPath);
		const sinceId = getMaxMentionId(existingMentions);

		const fetched = await withSpinner(
			sinceId === undefined
				? `Fetching all webmentions for ${credentials.domain}`
				: `Fetching webmentions for ${credentials.domain} since ${String(sinceId)}`,
			() => fetchNewMentions({ ...credentials, signal }, sinceId),
		);

		const mergedMentions = new Map(existingMentions);

		for (const mention of fetched.mentions) mergedMentions.set(mention['wm-id'], mention);

		const sortedMentions = [...mergedMentions.values()].toSorted(
			(mentionA, mentionB) => mentionA['wm-id'] - mentionB['wm-id'],
		);

		safelyCreateDirectory(outputDirectory);

		await writeFile(
			outputPath,
			sortedMentions.map((mention) => JSON.stringify(mention)).join('\n') + '\n',
		);

		const propertyCounts = new Map<string, number>();
		const targets = new Set<string>();

		for (const mention of sortedMentions) {
			propertyCounts.set(
				mention['wm-property'],
				(propertyCounts.get(mention['wm-property']) ?? 0) + 1,
			);
			targets.add(mention['wm-target']);
		}

		log.success(`Wrote ${formatCount(sortedMentions.length)} webmentions → ${outputPath}`);

		const sortedCounts = [...propertyCounts].toSorted(([propertyA], [propertyB]) =>
			propertyA.localeCompare(propertyB),
		);

		log.summary([
			['New this run', fetched.mentions.length],
			['Targets', targets.size],
			...sortedCounts,
			...(fetched.privateCount > 0
				? [['Private, dropped', fetched.privateCount] satisfies [string, number]]
				: []),
		]);

		if (fetched.invalidCount > 0) {
			log.warn(`${formatCount(fetched.invalidCount)} unrecognized webmentions skipped`);
		}
	},
	summary: 'Fetch new webmentions from webmention.io into the content data directory',
	title: 'Webmentions',
});
