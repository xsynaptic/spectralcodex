#!/usr/bin/env tsx
import chalk from 'chalk';
import path from 'node:path';
import { parseArgs } from 'node:util';
import pLimit from 'p-limit';

import type { UrlStatus } from '#check-links/types.ts';

import { checkUrl } from '#check-links/client.ts';
import {
	closeDatabase,
	getEntryDigest,
	getUrlsToCheck,
	openDatabase,
	recordCheckResult,
	syncUrlSources,
	upsertUrl,
} from '#check-links/db.ts';
import { extractLinksFromEntry } from '#check-links/extract.ts';
import { printList, printSessionSummary, printStatus } from '#check-links/report.ts';
import { UrlStatusEnum } from '#check-links/types.ts';
import { getCollectionEntries, withAstroContent } from '#shared/astro-content.ts';
import { findWorkspaceRoot } from '#shared/utils.ts';

const statusLabels: Record<UrlStatus, string> = {
	[UrlStatusEnum.Blocked]: chalk.cyan('Blocked'),
	[UrlStatusEnum.Error]: chalk.red('Error'),
	[UrlStatusEnum.Healthy]: chalk.green('Healthy'),
	[UrlStatusEnum.Missing]: chalk.magenta('Missing'),
	[UrlStatusEnum.Pending]: chalk.gray('Pending'),
	[UrlStatusEnum.Redirect]: chalk.yellow('Redirected'),
} as const;

const rootPath = findWorkspaceRoot();

const { values } = parseArgs({
	args: process.argv.slice(2),
	options: {
		concurrency: { default: '10', type: 'string' },
		'db-path': { default: '.cache/check-links.db', type: 'string' },
		'domain-limit': { default: '2', type: 'string' },
		ignore: { multiple: true, type: 'string' },
		list: { type: 'string' },
		'max-missing': { default: '3', type: 'string' },
		recheck: { type: 'string' },
		'recheck-all': { default: false, type: 'boolean' },
		status: { default: false, type: 'boolean' },
	},
});

const linkCollections = ['locations', 'pages', 'posts', 'regions', 'resources', 'themes'] as const;

const dbPath = path.resolve(rootPath, values['db-path']);
const concurrency = Number(values.concurrency);
const domainLimit = Number(values['domain-limit']);
const maxMissing = Number(values['max-missing']);

const defaultIgnorePatterns = [
	'maps.google.com',
	'goo.gl/maps',
	'google.com/maps',
	'maps.app.goo.gl',
	'localhost',
	'127.0.0.1',
];

const ignorePatterns = [...defaultIgnorePatterns, ...(values.ignore ?? [])];

function getDomain(url: string): string {
	try {
		return new URL(url).hostname;
	} catch {
		return 'unknown';
	}
}

function isHealthyStatus(status: UrlStatus): boolean {
	return status === UrlStatusEnum.Healthy || status === UrlStatusEnum.Blocked;
}

function shouldIgnoreUrl(url: string): boolean {
	return ignorePatterns.some((pattern) => url.includes(pattern));
}

let isShuttingDown = false;

process.on('SIGINT', () => {
	if (isShuttingDown) {
		console.log(chalk.yellow('\nForce quit!'));
		process.exit(1);
	}

	isShuttingDown = true;
	console.log(chalk.yellow('\nShutting down... waiting for in-flight requests'));
});

async function syncLinks() {
	console.log(chalk.blue('Loading content...'));

	const collectionEntries = await withAstroContent((content) =>
		getCollectionEntries(content, [...linkCollections]),
	);

	const extractedSources: Array<{ contentId: string; urlId: number }> = [];
	const extractedEntries = new Set<string>();
	const allEntryDigests: Array<{ contentId: string; digest: string }> = [];
	let skipped = 0;

	for (const entry of collectionEntries) {
		const contentId = `${entry.collection}/${entry.id}`;
		const digest = entry.digest === undefined ? '' : String(entry.digest);

		allEntryDigests.push({ contentId, digest });

		if (digest && getEntryDigest(contentId) === digest) {
			skipped++;
			continue;
		}

		extractedEntries.add(contentId);

		const links = extractLinksFromEntry(entry).filter((link) => !shouldIgnoreUrl(link.url));

		for (const link of links) {
			extractedSources.push({ contentId, urlId: upsertUrl(link.url) });
		}
	}

	const orphanedUrls = syncUrlSources(extractedSources, extractedEntries, allEntryDigests);

	console.log(
		chalk.blue(
			`Synced ${String(extractedEntries.size)} entries (${String(skipped)} unchanged). ${String(orphanedUrls)} orphaned URLs pruned.`,
		),
	);
}

try {
	openDatabase(dbPath);

	if (values.status) {
		printStatus();
		closeDatabase();
		process.exit(0);
	}

	if (values.list !== undefined) {
		const filter = values.list === '' ? undefined : values.list;

		printStatus();
		printList(filter);
		closeDatabase();
		process.exit(0);
	}

	await syncLinks();

	const recheckFilter =
		values.recheck && values.recheck !== ''
			? { recheckStatuses: values.recheck.split(',') as Array<UrlStatus> }
			: {};

	const urlsToCheck = getUrlsToCheck({
		recheck: values.recheck !== undefined,
		...recheckFilter,
		maxMissing,
		recheckAll: values['recheck-all'],
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
			if (isShuttingDown) return;

			const domain = getDomain(row.url);
			const perDomainLimit = getDomainLimit(domain);

			await perDomainLimit(async () => {
				if (isShuttingDown) return;

				const result = await checkUrl(row);

				recordCheckResult(result.urlId, {
					httpStatus: result.httpStatus,
					redirectUrl: result.redirectUrl,
					status: result.status,
				});

				checked++;

				const isIssue = !isHealthyStatus(result.status);

				if (isIssue) {
					issueCount++;
				} else {
					healthyCount++;
				}

				const isRecovery =
					result.status === UrlStatusEnum.Healthy && row.status !== UrlStatusEnum.Pending;

				if (isIssue || isRecovery) {
					console.log(
						`  [${String(checked)}/${String(urlsToCheck.length)}] ${statusLabels[result.status]} ${chalk.gray(row.url)}`,
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
