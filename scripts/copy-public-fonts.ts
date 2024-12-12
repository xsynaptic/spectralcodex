/* eslint-disable unicorn/no-process-exit */
import { promises as fs } from 'node:fs';
import path from 'node:path';

// Note: these should match whatever is being used in the Satori config
const filesToCopy = [
	'node_modules/@fontsource/geologica/files/geologica-latin-300-normal.woff',
	'node_modules/@fontsource/geologica/files/geologica-latin-500-normal.woff',
	'node_modules/@fontsource/geologica/files/geologica-latin-700-normal.woff',
];

const destinationDir = 'public/fonts';

async function fileExists(filePath: string) {
	try {
		await fs.access(filePath);
		return true;
	} catch {
		return false;
	}
}

async function getFileMTime(filePath: string) {
	const stats = await fs.stat(filePath);

	return stats.mtime;
}

async function copyPublicFonts() {
	for (const relativePath of filesToCopy) {
		const source = path.resolve(relativePath);
		const destination = path.join(destinationDir, path.basename(relativePath));
		const destinationExists = await fileExists(destination);

		if (destinationExists) {
			const [sourceMTime, destinationMTime] = await Promise.all([
				getFileMTime(source),
				getFileMTime(destination),
			]);

			if (sourceMTime <= destinationMTime) {
				console.log(`Skipping "${source}" as it already exists and is not modified.`);
				continue;
			}
		}

		await fs.mkdir(path.dirname(destination), { recursive: true });
		await fs.copyFile(source, destination);

		console.log(`Copied "${source}" to "${destination}"`);
	}
}

try {
	await copyPublicFonts();
} catch (error) {
	console.error(error);
	process.exit(1);
}
