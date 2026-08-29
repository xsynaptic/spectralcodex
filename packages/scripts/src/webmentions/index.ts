#!/usr/bin/env tsx
import type { Webmention } from '@spectralcodex/shared/schemas';

import { WebmentionSchema } from '@spectralcodex/shared/schemas';
import chalk from 'chalk';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sanitizeHtml from 'sanitize-html';

import { findWorkspaceRoot, isExistingFile, safelyCreateDirectory } from '../shared/utils.js';

const apiUrl = 'https://webmention.io/api/mentions.jf2';
const userAgent = 'SpectralCodex-Webmentions/1.0 (+https://spectralcodex.com)';
const timeoutMs = 30_000;
const perPage = 1000;

// Markup is stored clean so a future rich renderer needs no refetch
const sanitizeOptions = {
	allowedTags: ['a', 'b', 'blockquote', 'br', 'code', 'em', 'i', 'p', 'pre', 'strong'],
	allowedAttributes: { a: ['href'] },
	allowedSchemes: ['http', 'https', 'mailto'],
} satisfies sanitizeHtml.IOptions;

// The feature is env-gated, so absent credentials are a clean skip rather than a failure
function loadCredentials() {
	const domain = process.env.WEBMENTION_DOMAIN;
	const token = process.env.WEBMENTION_API_KEY;

	if (domain && token) return { domain, token };

	const missing = [
		...(domain ? [] : ['WEBMENTION_DOMAIN']),
		...(token ? [] : ['WEBMENTION_API_KEY']),
	];

	console.warn(chalk.yellow(`Skipping webmentions; missing ${missing.join(', ')}`));
	process.exit(0);
}

const { domain, token } = loadCredentials();

const rootPath = findWorkspaceRoot();

// `CONTENT_DATA_PATH` points at `collections/`; webmentions live in the sibling `data/` directory
const collectionsPath = process.env.CONTENT_DATA_PATH ?? 'packages/content-demo/collections';
const outputDirectory = path.join(rootPath, collectionsPath, '..', 'data');
const outputPath = path.join(outputDirectory, 'webmentions.jsonl');

async function readExistingMentions() {
	const mentions = new Map<number, Webmention>();

	if (!(await isExistingFile(outputPath))) return mentions;

	const fileContents = await readFile(outputPath, 'utf8');

	for (const line of fileContents.split('\n')) {
		if (line.trim() === '') continue;

		const result = parseMention(line);

		if (!result) {
			console.warn(chalk.yellow(`Discarding unreadable line in ${outputPath}`));
			continue;
		}

		mentions.set(result['wm-id'], result);
	}

	return mentions;
}

function parseMention(line: string) {
	try {
		const result = WebmentionSchema.safeParse(JSON.parse(line));

		return result.success ? result.data : undefined;
	} catch {
		return;
	}
}

async function fetchMentionsPage({ page, sinceId }: { page: number; sinceId: number | undefined }) {
	const url = new URL(apiUrl);

	url.searchParams.set('domain', domain);
	url.searchParams.set('token', token);
	url.searchParams.set('per-page', String(perPage));
	url.searchParams.set('page', String(page));
	url.searchParams.set('sort-by', 'created');
	url.searchParams.set('sort-dir', 'up');

	if (sinceId !== undefined) url.searchParams.set('since_id', String(sinceId));

	const response = await fetch(url, {
		headers: { 'User-Agent': userAgent, Accept: 'application/json' },
		signal: AbortSignal.timeout(timeoutMs),
	});

	if (!response.ok) {
		throw new Error(`webmention.io responded ${String(response.status)} for page ${String(page)}`);
	}

	const body = (await response.json()) as { children?: Array<unknown> };

	return body.children ?? [];
}

function sanitizeMention(mention: Webmention): Webmention {
	const html = mention.content?.html;

	if (!html) return mention;

	return {
		...mention,
		content: { ...mention.content, html: sanitizeHtml(html, sanitizeOptions) },
	};
}

function getMaxMentionId(mentions: Map<number, Webmention>) {
	let maxId: number | undefined;

	for (const mentionId of mentions.keys()) {
		if (maxId === undefined || mentionId > maxId) maxId = mentionId;
	}

	return maxId;
}

const existingMentions = await readExistingMentions();
const sinceId = getMaxMentionId(existingMentions);

console.log(
	chalk.blue(
		sinceId === undefined
			? `Fetching all webmentions for ${domain}...`
			: `Fetching webmentions for ${domain} since ${String(sinceId)}...`,
	),
);

const mergedMentions = new Map(existingMentions);

let page = 0;
let addedCount = 0;
let invalidCount = 0;
let privateCount = 0;

for (;;) {
	const items = await fetchMentionsPage({ page, sinceId });

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

		mergedMentions.set(result.data['wm-id'], sanitizeMention(result.data));
		addedCount += 1;
	}

	if (items.length < perPage) break;

	page += 1;
}

const sortedMentions = [...mergedMentions.values()].sort(
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
	propertyCounts.set(mention['wm-property'], (propertyCounts.get(mention['wm-property']) ?? 0) + 1);
	targets.add(mention['wm-target']);
}

console.log(chalk.green(`Wrote ${String(sortedMentions.length)} webmentions → ${outputPath}`));
console.log(chalk.gray(`  New this run:  ${String(addedCount)}`));
console.log(chalk.gray(`  Targets:       ${String(targets.size)}`));

const sortedCounts = [...propertyCounts].sort(([propertyA], [propertyB]) =>
	propertyA.localeCompare(propertyB),
);

for (const [property, count] of sortedCounts) {
	console.log(chalk.gray(`  ${property.padEnd(14)} ${String(count)}`));
}

if (privateCount > 0) console.log(chalk.gray(`  Private, dropped: ${String(privateCount)}`));
if (invalidCount > 0) console.log(chalk.yellow(`  Unrecognized, skipped: ${String(invalidCount)}`));
