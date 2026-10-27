import { getCachePaths } from '@spectralcodex/shared/paths';
import {
	createProgress,
	formatCount,
	getCollectionEntries,
	log,
	parseNumberOption,
	withAstroContent,
	withSpinner,
} from '@xsynaptic/astro-scripts';
import chalk from 'chalk';
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
import { defineCommand, runCommand } from '#shared/command.ts';

const statusLabels: Record<UrlStatus, string> = {
	[UrlStatusEnum.Blocked]: chalk.cyan('Blocked'),
	[UrlStatusEnum.Error]: chalk.red('Error'),
	[UrlStatusEnum.Healthy]: chalk.green('Healthy'),
	[UrlStatusEnum.Missing]: chalk.magenta('Missing'),
	[UrlStatusEnum.Pending]: chalk.gray('Pending'),
	[UrlStatusEnum.Redirect]: chalk.yellow('Redirected'),
} as const;

const linkCollections = ['locations', 'pages', 'posts', 'regions', 'resources', 'themes'] as const;

const defaultIgnorePatterns = [
	'maps.google.com',
	'goo.gl/maps',
	'google.com/maps',
	'maps.app.goo.gl',
	'localhost',
	'127.0.0.1',
];

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

async function syncLinks(ignorePatterns: Array<string>) {
	const collectionEntries = await withSpinner('Loading content', () =>
		withAstroContent((content) => getCollectionEntries(content, [...linkCollections])),
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

		const links = extractLinksFromEntry(entry).filter((link) =>
			ignorePatterns.every((pattern) => !link.url.includes(pattern)),
		);

		for (const link of links) {
			extractedSources.push({ contentId, urlId: upsertUrl(link.url) });
		}
	}

	const orphanedUrls = syncUrlSources(extractedSources, extractedEntries, allEntryDigests);

	log.success(
		`Synced ${formatCount(extractedEntries.size)} entries (${formatCount(skipped)} unchanged); ${formatCount(orphanedUrls)} orphaned URLs pruned`,
	);
}

async function checkUrls(
	urlsToCheck: ReturnType<typeof getUrlsToCheck>,
	{
		concurrency,
		domainLimit,
		signal,
	}: { concurrency: number; domainLimit: number; signal: AbortSignal },
) {
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

	const counts = { checked: 0, healthy: 0, issues: 0 };
	const progress = createProgress({
		label: 'Checking',
		note: () => `${formatCount(counts.issues)} issues`,
		total: urlsToCheck.length,
	});

	await Promise.all(
		urlsToCheck.map((row) =>
			globalLimit(async () => {
				if (signal.aborted) return;

				await getDomainLimit(getDomain(row.url))(async () => {
					const result = await checkUrl(row, signal);

					if (signal.aborted) return;

					recordCheckResult(result.urlId, {
						httpStatus: result.httpStatus,
						redirectUrl: result.redirectUrl,
						status: result.status,
					});

					counts.checked++;
					progress.tick();

					const isIssue = !isHealthyStatus(result.status);

					if (isIssue) {
						counts.issues++;
					} else {
						counts.healthy++;
					}

					const isRecovery =
						result.status === UrlStatusEnum.Healthy && row.status !== UrlStatusEnum.Pending;

					if (isIssue || isRecovery) {
						log.info(`${statusLabels[result.status]} ${chalk.gray(row.url)}`);
					}
				});
			}),
		),
	);

	if (signal.aborted) {
		progress.warn();
	} else {
		progress.succeed();
	}

	printSessionSummary(counts.checked, counts.healthy, counts.issues);
	signal.throwIfAborted();
}

await runCommand(
	defineCommand({
		interrupted: 'finished checks are recorded',
		name: 'check-links',
		options: {
			concurrency: { default: '10', description: 'Requests in flight at once', type: 'string' },
			'domain-limit': {
				default: '2',
				description: 'Requests in flight per domain',
				type: 'string',
			},
			ignore: {
				description: 'Skip URLs containing this text; repeatable',
				multiple: true,
				type: 'string',
			},
			list: {
				description: 'Print stored issues, optionally only these comma-separated statuses',
				type: 'string',
			},
			'max-missing': {
				default: '3',
				description: 'Stop rechecking a failing URL after this many checks',
				type: 'string',
			},
			recheck: {
				description:
					'Recheck URLs with these comma-separated statuses (empty for pending and issues)',
				type: 'string',
			},
			'recheck-all': { default: false, description: 'Recheck every URL', type: 'boolean' },
			status: { default: false, description: 'Print stored totals and exit', type: 'boolean' },
		},
		async run({ paths, signal, values }) {
			openDatabase(getCachePaths(paths.cachePath).checkLinksPath);

			try {
				if (values.status) {
					printStatus();
					return;
				}

				if (values.list !== undefined) {
					printStatus();
					printList(values.list === '' ? undefined : values.list);
					return;
				}

				await syncLinks([...defaultIgnorePatterns, ...(values.ignore ?? [])]);

				const recheckFilter =
					values.recheck && values.recheck !== ''
						? { recheckStatuses: values.recheck.split(',') as Array<UrlStatus> }
						: {};

				const urlsToCheck = getUrlsToCheck({
					recheck: values.recheck !== undefined,
					...recheckFilter,
					maxMissing: parseNumberOption(values['max-missing'], 'max-missing'),
					recheckAll: values['recheck-all'],
				});

				if (urlsToCheck.length === 0) {
					log.success('No URLs to check');
					return;
				}

				await checkUrls(urlsToCheck, {
					concurrency: parseNumberOption(values.concurrency, 'concurrency'),
					domainLimit: parseNumberOption(values['domain-limit'], 'domain-limit'),
					signal,
				});
			} finally {
				closeDatabase();
			}
		},
		summary: 'Check external links in content and track their status in a local database',
		title: 'Check links',
	}),
);
