import { defineIntegration } from 'astro-integration-kit';
import { appendFile } from 'node:fs/promises';
import { z } from 'zod';

export default defineIntegration({
	name: 'astro-build-logger',
	optionsSchema: z
		.object({
			/**
			 * A name for the log file
			 *
			 * @default `"astro-build.log"`
			 */
			logFileName: z.string().optional(),
		})
		.optional(),
	setup({ options }) {
		let buildStartTime: number;

		const logFileName = options?.logFileName ?? 'astro-build.log';

		return {
			hooks: {
				'astro:build:start': ({ logger }) => {
					buildStartTime = Date.now();
					logger.info(`Build timing started at ${new Date(buildStartTime).toISOString()}`);
				},
				'astro:build:done': async ({ logger }) => {
					const buildEndTime = Date.now();
					const duration = (buildEndTime - buildStartTime) / 1000;
					const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);

					const durationDate = new Date(duration * 1000);
					const hours = durationDate.getUTCHours().toString().padStart(2, '0');
					const minutes = durationDate.getUTCMinutes().toString().padStart(2, '0');
					const seconds = durationDate.getUTCSeconds().toString().padStart(2, '0');
					const formattedTime = `${hours}:${minutes}:${seconds}`;

					const logEntry = `[${timestamp}] Build completed in ${formattedTime}\n`;

					try {
						await appendFile(logFileName, logEntry);
						logger.info(`Build time logged: ${duration.toFixed(1)}s`);
					} catch (error) {
						logger.error(
							`Failed to write build log: ${error instanceof Error ? error.message : 'unknown error'}`,
						);
					}
				},
			},
		};
	},
});
