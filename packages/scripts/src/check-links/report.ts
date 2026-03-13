import chalk from 'chalk';

import type { UrlStatus } from './types.ts';

import { getStats, getUrlsByStatusGroupedByContent } from './db.ts';
import { UrlStatusEnum } from './types.ts';

function entryId(contentId: string): string {
	// content_id is "collection/entry-id", we only need the entry ID
	const slash = contentId.indexOf('/');

	if (slash === -1) return contentId;

	return contentId.slice(slash + 1);
}

function printSection(
	status: UrlStatus,
	label: string,
	color: (s: string) => string,
	formatUrl: (row: {
		url: string;
		redirect_url: string | null;
		last_http_status: number | null;
		check_count: number;
	}) => string,
): void {
	const grouped = getUrlsByStatusGroupedByContent(status);

	if (grouped.size === 0) return;

	console.log('');
	console.log(color(`--- ${label} (${String(grouped.size)} entries) ---`));

	for (const [contentId, rows] of grouped) {
		console.log(`  ${entryId(contentId)}:`);

		for (const row of rows) {
			console.log(`    - ${formatUrl(row)}`);
		}
	}
}

export function printStatus(): void {
	const { total, healthy, redirect, missing, blocked, error, pending } = getStats();

	console.log('');
	console.log(chalk.magenta('=== Link Check Status ==='));
	console.log('');
	console.log(`  Total URLs:  ${String(total)}`);
	console.log(`  Healthy:     ${chalk.green(String(healthy))}`);
	console.log(`  Redirected:  ${chalk.yellow(String(redirect))}`);
	console.log(`  Missing:     ${chalk.magenta(String(missing))}`);
	console.log(`  Blocked:     ${chalk.cyan(String(blocked))}`);
	console.log(`  Error:       ${chalk.red(String(error))}`);
	console.log(`  Pending:     ${chalk.gray(String(pending))}`);
	console.log('');
}

export function printList(filter?: string): void {
	const filterSet = filter ? new Set(filter.split(',')) : undefined;
	const show = (status: string) => !filterSet || filterSet.has(status);

	if (show(UrlStatusEnum.Redirect)) {
		printSection(
			UrlStatusEnum.Redirect,
			'Redirected',
			chalk.yellow,
			(row) => `${row.url} -> ${row.redirect_url ?? 'unknown'}`,
		);
	}

	if (show(UrlStatusEnum.Missing)) {
		printSection(
			UrlStatusEnum.Missing,
			'Missing',
			chalk.magenta,
			(row) => `${row.url} ${chalk.gray(`[${String(row.check_count)}x]`)}`,
		);
	}

	if (show(UrlStatusEnum.Blocked)) {
		printSection(
			UrlStatusEnum.Blocked,
			'Blocked; needs manual verification',
			chalk.cyan,
			(row) =>
				`${row.url} ${chalk.gray(`[HTTP ${String(row.last_http_status ?? '?')}, ${String(row.check_count)}x]`)}`,
		);
	}

	if (show(UrlStatusEnum.Error)) {
		printSection(UrlStatusEnum.Error, 'Error', chalk.red, (row) => row.url);
	}

	console.log('');
}

export function printSessionSummary(checked: number, healthy: number, issues: number): void {
	console.log('');
	console.log(
		chalk.blue(
			`Session: ${String(checked)} checked, ${chalk.green(`${String(healthy)} healthy`)}, ${chalk.red(`${String(issues)} issues`)}`,
		),
	);
}
