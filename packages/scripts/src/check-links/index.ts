#!/usr/bin/env tsx
import chalk from 'chalk';
import path from 'node:path';
import { parseArgs } from 'node:util';
import pLimit from 'p-limit';

import type { UrlStatus } from './types.ts';

import { loadDataStore, getDataStoreCollection } from '../shared/data-store.ts';
import { checkUrl } from './client.ts';
import {
	closeDatabase,
	getEntryDigest,
	getUrlsToCheck,
	openDatabase,
	recordCheckResult,
	syncUrlSources,
	upsertUrl,
} from './db.ts';
import { extractLinksFromEntry } from './extract.ts';
import { printList, printSessionSummary, printStatus } from './report.ts';
import { UrlStatusEnum } from './types.ts';

const STATUS_LABELS: Record<UrlStatus, string> = {
	[UrlStatusEnum.Pending]: chalk.gray('Pending'),
	[UrlStatusEnum.Healthy]: chalk.green('Healthy'),
	[UrlStatusEnum.Blocked]: chalk.cyan('Blocked'),
	[UrlStatusEnum.Redirect]: chalk.yellow('Redirected'),
	[UrlStatusEnum.Missing]: chalk.magenta('Missing'),
	[UrlStatusEnum.Error]: chalk.red('Error'),
} as const;

const { values } = parseArgs({
	args: process.argv.slice(2),
	options: {
		'root-path': { type: 'string', default: process.cwd() },
		'data-store-path': { type: 'string', default: '.astro/data-store.json' },
		'db-path': { type: 'string', default: '.cache/check-links.db' },
		recheck: { type: 'string' },
		'recheck-all': { type: 'boolean', default: false },
		list: { type: 'string' },
		status: { type: 'boolean', default: false },
		concurrency: { type: 'string', default: '10' },
		'domain-limit': { type: 'string', default: '2' },
		'max-missing': { type: 'string', default: '3' },
		ignore: { type: 'string', multiple: true },
	},
});

/**
 * Collections that may contain external links
 */
export const LINK_COLLECTIONS = [
	'locations',
	'notes',
	'pages',
	'posts',
	'regions',
	'resources',
	'series',
	'themes',
] as const;

const rootPath = values['root-path'];
const dataStorePath = path.resolve(rootPath, values['data-store-path']);
const dbPath = path.resolve(rootPath, values['db-path']);
const concurrency = Number.parseInt(values.concurrency, 10);
const domainLimit = Number.parseInt(values['domain-limit'], 10);
const maxMissing = Number.parseInt(values['max-missing'], 10);

/**
 * Ignore patterns
 */
const DEFAULT_IGNORE_PATTERNS = [
	'maps.google.com',
	'goo.gl/maps',
	'google.com/maps',
	'maps.app.goo.gl',
	'localhost',
	'127.0.0.1',
];

const ignorePatterns = [...DEFAULT_IGNORE_PATTERNS, ...(values.ignore ?? [])];

function shouldIgnoreUrl(url: string): boolean {
	return ignorePatterns.some((pattern) => url.includes(pattern));
}

function getDomain(url: string): string {
	try {
		return new URL(url).hostname;
	} catch {
		return 'unknown';
	}
}

let shuttingDown = false;

process.on('SIGINT', () => {
	if (shuttingDown) {
		console.log(chalk.yellow('\nForce quit!'));
		process.exit(1);
	}

	shuttingDown = true;
	console.log(chalk.yellow('\nShutting down... waiting for in-flight requests'));
});

try {
	openDatabase(dbPath);

	// Status-only mode: --status
	if (values.status) {
		printStatus();
		closeDatabase();
		process.exit(0);
	}

	// List mode: --list or --list=redirect,missing,...
	if (values.list !== undefined) {
		const filter = values.list === '' ? undefined : values.list;

		printStatus();
		printList(filter);
		closeDatabase();
		process.exit(0);
	}

	console.log(chalk.blue('Loading data store...'));

	const { collections } = loadDataStore(dataStorePath);

	const extractedSources: Array<{ urlId: number; contentId: string }> = [];
	const extractedEntries = new Set<string>();
	const allEntryDigests: Array<{ contentId: string; digest: string }> = [];
	let skipped = 0;

	for (const collectionName of LINK_COLLECTIONS) {
		const entries = getDataStoreCollection(collections, collectionName);

		for (const entry of entries) {
			const contentId = `${collectionName}/${entry.id}`;
			const digest = entry.digest ?? '';

			allEntryDigests.push({ contentId, digest });

			// Skip extraction if digest hasn't changed
			if (digest && getEntryDigest(contentId) === digest) {
				skipped++;
				continue;
			}

			extractedEntries.add(contentId);

			const links = extractLinksFromEntry(entry);

			for (const link of links) {
				if (shouldIgnoreUrl(link.url)) continue;

				const urlId = upsertUrl(link.url);

				extractedSources.push({ urlId, contentId });
			}
		}
	}

	const orphanedUrls = syncUrlSources(extractedSources, extractedEntries, allEntryDigests);

	console.log(
		chalk.blue(
			`Synced ${String(extractedEntries.size)} entries (${String(skipped)} unchanged). ${String(orphanedUrls)} orphaned URLs pruned.`,
		),
	);

	// === Check phase ===
	const recheckFilter =
		values.recheck && values.recheck !== ''
			? { recheckStatuses: values.recheck.split(',') as Array<UrlStatus> }
			: {};

	const urlsToCheck = getUrlsToCheck({
		recheck: values.recheck !== undefined,
		...recheckFilter,
		recheckAll: values['recheck-all'],
		maxMissing,
	});

	if (urlsToCheck.length === 0) {
		console.log(chalk.green('No URLs to check.'));
		closeDatabase();
		process.exit(0);
	}

	console.log(chalk.blue(`Checking ${String(urlsToCheck.length)} URLs...`));

	const globalLimit = pLimit(concurrency);
	const domainLimits = new Map<string, ReturnType<typeof pLimit>>();

	function getDomainLimit(domain: string): ReturnType<typeof pLimit> {
		let limit = domainLimits.get(domain);

		if (!limit) {
			limit = pLimit(domainLimit);
			domainLimits.set(domain, limit);
		}

		return limit;
	}

	let checked = 0;
	let healthyCount = 0;
	let issueCount = 0;

	const promises = urlsToCheck.map((row) =>
		globalLimit(async () => {
			if (shuttingDown) return;

			const domain = getDomain(row.url);
			const perDomainLimit = getDomainLimit(domain);

			await perDomainLimit(async () => {
				if (shuttingDown) return;

				const result = await checkUrl(row);

				recordCheckResult(result.urlId, {
					httpStatus: result.httpStatus,
					status: result.status,
					redirectUrl: result.redirectUrl,
				});

				checked++;

				if (result.status === UrlStatusEnum.Healthy || result.status === UrlStatusEnum.Blocked) {
					healthyCount++;
				} else {
					issueCount++;
				}

				// Log issues, recoveries, and periodic progress
				const isIssue =
					result.status !== UrlStatusEnum.Healthy && result.status !== UrlStatusEnum.Blocked;
				const isRecovery =
					result.status === UrlStatusEnum.Healthy && row.status !== UrlStatusEnum.Pending;

				if (isIssue || isRecovery) {
					console.log(
						`  [${String(checked)}/${String(urlsToCheck.length)}] ${STATUS_LABELS[result.status]} ${chalk.gray(row.url)}`,
					);
				} else if (checked % 100 === 0) {
					console.log(chalk.gray(`  [${String(checked)}/${String(urlsToCheck.length)}] ...`));
				}
			});
		}),
	);

	await Promise.all(promises);

	printSessionSummary(checked, healthyCount, issueCount);
	closeDatabase();
} catch (error) {
	console.error(chalk.red('Error:'), error);
	process.exit(1);
}
