/* eslint-disable unicorn/no-process-exit -- Required for this script */
import { promises as fs } from 'node:fs';
import path from 'node:path';

const { BUILD_ASSETS_PATH } = process.env;

// Read the path to the image folder from an environment variable
const imageFolder = `./dist/${String(BUILD_ASSETS_PATH)}`;

if (BUILD_ASSETS_PATH) {
	console.log(`Cleaning images in "${imageFolder}"!`);
} else {
	console.error(
		'Please ensure BUILD_ASSETS_PATH is correctly configured in the environment variable file.',
	);
	process.exit(1);
}

// Regex to identify original images, which are generated with an 8 character hash appended
// Processed images have an additional suffix
// Match this: `original-file-name.DMGu6fLG.jpg`
// NOT this: `original-file-name.DMGu6fLG_a8Fms.jpg`
const originalImageRegex = /^[\w#$%+=@~-]+\.[\w-]{8}\.(jpg|jpeg|png|webp)$/i;

// All matching images are removed except for what is added to this whitelist
// TODO: this should be formalized somehow
const allowList = new Set(['synaptic-geoguessr-tainan.png']);

async function getFiles(dir: string): Promise<string[]> {
	const directoryEntries = await fs.readdir(dir, { withFileTypes: true });
	const files = await Promise.all(
		directoryEntries.map((directoryEntry) => {
			const res = path.resolve(dir, directoryEntry.name);

			return directoryEntry.isDirectory() ? getFiles(res) : Promise.resolve([res]);
		}),
	);
	return files.flat();
}

async function main(dryRun: boolean) {
	try {
		const files = await getFiles(imageFolder);
		const filesDeleting = files.filter(
			(file) =>
				originalImageRegex.test(path.basename(file)) && !allowList.has(path.basename(file)),
		);

		if (dryRun) {
			console.log('The following files would be removed:');
			for (const file of filesDeleting) console.log(file);
		} else {
			await Promise.all(filesDeleting.map((file) => fs.unlink(file)));
			console.log(`${String(filesDeleting.length)} original images removed successfully.`);
		}
	} catch (error) {
		console.error('Error:', error);
	}
}

// Check if the script should perform a dry run
const dryRun = process.argv.includes('--dry-run');

await main(dryRun);
