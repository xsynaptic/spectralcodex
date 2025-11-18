import fs from 'node:fs';
import path from 'node:path';

// Super simple file logging to debug Astro builds
export function logError(message: string) {
	if (typeof import.meta.env.PWD !== 'string') {
		throw new TypeError('import.meta.env.PWD not set!');
	}

	const logFilePath = path.join(import.meta.env.PWD, 'astro-error.log');
	const errorMessage = `[${new Date().toISOString()}] - ${message}\n`;

	if (!fs.existsSync(logFilePath)) {
		fs.writeFileSync(logFilePath, ''); // Create an empty log file, if needed
	}
	fs.appendFile(logFilePath, errorMessage, (error) => {
		if (error) {
			console.error('Error writing to log file:', error);
		}
	});
}
