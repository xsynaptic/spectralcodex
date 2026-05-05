import type { AstroIntegration } from 'astro';

import astroPackage from 'astro/package.json' with { type: 'json' };
import { appendFile, readdir, stat } from 'node:fs/promises';
import { z } from 'zod';

const optionsSchema = z
	.object({
		/**
		 * Path to the JSONL log file
		 *
		 * @default `"astro-build.jsonl"`
		 */
		logFileName: z.string().optional(),
	})
	.optional();

type Options = z.input<typeof optionsSchema>;

interface BuildLogEntry {
	timestamp: string;
	durationSeconds: number;
	pageCount: number;
	outputBytes: number;
	astroVersion: string;
	nodeVersion: string;
	summary: string;
	notes?: string;
}

function formatDuration(totalSeconds: number): string {
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = Math.round(totalSeconds % 60);

	if (hours > 0) return `${String(hours)}h ${String(minutes)}m ${String(seconds)}s`;
	if (minutes > 0) return `${String(minutes)}m ${String(seconds)}s`;

	return `${String(seconds)}s`;
}

function formatBytes(bytes: number): string {
	const units = ['B', 'KB', 'MB', 'GB'];
	let value = bytes;
	let unitIndex = 0;

	while (value >= 1024 && unitIndex < units.length - 1) {
		value /= 1024;
		unitIndex += 1;
	}

	const precision = value >= 10 || unitIndex === 0 ? 0 : 1;

	return `${value.toFixed(precision)} ${units[unitIndex] ?? 'B'}`;
}

function formatSummary(durationSeconds: number, pageCount: number, outputBytes: number): string {
	return `${formatDuration(durationSeconds)} (${String(pageCount)} pages, ${formatBytes(outputBytes)})`;
}

async function getDirectorySize(dir: URL): Promise<number> {
	const entries = await readdir(dir, { withFileTypes: true });
	let total = 0;

	for (const entry of entries) {
		const child = new URL(entry.isDirectory() ? `${entry.name}/` : entry.name, dir);

		if (entry.isDirectory()) {
			total += await getDirectorySize(child);
		} else if (entry.isFile()) {
			const stats = await stat(child);
			total += stats.size;
		}
	}
	return total;
}

export default function buildLogger(options?: Options): AstroIntegration {
	const parsed = optionsSchema.parse(options);
	const logFileName = parsed?.logFileName ?? 'astro-build.jsonl';

	let buildStartTime: number;

	return {
		name: 'astro-build-logger',
		hooks: {
			'astro:build:start': ({ logger }) => {
				buildStartTime = Date.now();
				logger.info(`Build timing started at ${new Date(buildStartTime).toISOString()}`);
			},
			'astro:build:done': async ({ logger, pages, dir }) => {
				const buildEndTime = Date.now();
				const durationSeconds = Number(((buildEndTime - buildStartTime) / 1000).toFixed(2));
				const outputBytes = await getDirectorySize(dir);
				const summary = formatSummary(durationSeconds, pages.length, outputBytes);

				const entry: BuildLogEntry = {
					timestamp: new Date(buildEndTime).toISOString(),
					durationSeconds,
					pageCount: pages.length,
					outputBytes,
					astroVersion: astroPackage.version,
					nodeVersion: process.versions.node,
					summary,
				};

				try {
					await appendFile(logFileName, JSON.stringify(entry) + '\n');
					logger.info(`Build time logged: ${summary}`);
				} catch (error) {
					logger.error(
						`Failed to write build log: ${error instanceof Error ? error.message : 'unknown error'}`,
					);
				}
			},
		},
	};
}
