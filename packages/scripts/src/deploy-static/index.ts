#!/usr/bin/env tsx
import chalk from 'chalk';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import pLimit from 'p-limit';
import { $ } from 'zx';

const { values, positionals } = parseArgs({
	args: process.argv.slice(2),
	options: {
		'root-path': {
			type: 'string',
			short: 'r',
			default: process.cwd(),
		},
		'dist-path': {
			type: 'string',
			short: 'd',
			default: './dist',
		},
		'assets-path': {
			type: 'string',
			short: 'a',
			default: process.env.BUILD_ASSETS_PATH ?? '_x',
		},
		'images-path': {
			type: 'string',
			short: 'i',
			default: 'temp/images',
		},
		'remote-host-app': {
			type: 'string',
			default: process.env.DEPLOY_REMOTE_HOST_APP ?? 'user@remote-server:/path/to/app',
		},
		'remote-host-images': {
			type: 'string',
			default: process.env.DEPLOY_REMOTE_HOST_IMAGES ?? 'user@remote-server:/path/to/images',
		},
		'ssh-key-path': {
			type: 'string',
			default: process.env.DEPLOY_SSH_KEY_PATH,
		},
		'dry-run': {
			type: 'boolean',
			default: false,
		},
		verbose: {
			type: 'boolean',
			short: 'v',
			default: false,
		},
		'skip-build': {
			type: 'boolean',
			default: false,
		},
	},
	allowPositionals: true,
});

const distPath = path.join(values['root-path'], values['dist-path']);
const assetsPath = path.join(distPath, values['assets-path']);
const imagesPath = path.join(values['root-path'], values['images-path']);

const remoteHostApp = values['remote-host-app'];
const remoteHostImages = values['remote-host-images'];
const sshKeyPath = values['ssh-key-path'];

// A flag for whether we're using the remote image strategy, which affects the build output
const imageRemote = true as boolean;

const allImagePattern = /^[\w#$%+=@~-]+\.(avif|gif|jpg|jpeg|png|webp)$/i;
const originalImagePattern = /^[\w#$%+=@~-]+\.[\w-]{8}\.(avif|gif|jpg|jpeg|png|webp)$/i;
const processedImagePattern = imageRemote
	? /^[\w#$%+=@~-]+_[\w-]{1,8}\.(avif|gif|jpg|jpeg|png|webp)$/i
	: /^[\w#$%+=@~-]+\.[\w-]{8}_[\w-]+\.(avif|gif|jpg|jpeg|png|webp)$/i;

const dryRun = values['dry-run'];
const verbose = values.verbose;
const skipBuild = values['skip-build'];

// Output shell command results
$.verbose = true;

async function contentValidate() {
	console.log(chalk.blue('Validating content integrity...'));

	try {
		await $`pnpm content-validate --root-path=${values['root-path']}`;
		console.log(chalk.green('Content validation passed.'));
	} catch (error) {
		console.error(chalk.red('Content validation failed:'), error);
		process.exit(1);
	}
}

async function contentRelated() {
	console.log(chalk.blue('Generating related content...'));

	try {
		await $`pnpm content-related --root-path=${values['root-path']}`;
		console.log(chalk.green('Related content generated.'));
	} catch (error) {
		console.error(chalk.red('Related content generation failed:'), error);
		process.exit(1);
	}
}

async function buildProject() {
	if (skipBuild) {
		console.log(chalk.yellow('Skipping build...'));
		return;
	}
	console.log(chalk.blue('Building Astro project...'));

	try {
		// Run astro build from the root directory
		$.cwd = values['root-path'];
		await $`pnpm astro build`;
		$.cwd = process.cwd();
		console.log(chalk.green('Build completed.'));
		if (assetsPath.includes('temp')) await $`rm -rf ${assetsPath}`;
	} catch (error) {
		console.error(chalk.red('Error during build:'), error);
		process.exit(1);
	}
}

// With the remote image strategy original images are no longer copied to the output path
async function removeOriginalImages() {
	console.log(chalk.blue('Removing original built images...'));

	try {
		const limit = pLimit(200);
		const files = await fs.readdir(assetsPath);

		if (files.length > 0) {
			await Promise.all(
				files.map((file) =>
					limit(async () => {
						if (originalImagePattern.test(file)) {
							await fs.unlink(path.join(assetsPath, file));

							if (verbose) console.log(chalk.yellow(`Removed: ${file}`));
						} else {
							console.log(chalk.red(`File did not match original image pattern: ${file}`));
						}
					}),
				),
			);
		} else {
			console.log(chalk.yellow('No original images to remove!'));
		}
	} catch (error) {
		console.error(chalk.red('Error removing original images:'), error);
		process.exit(1);
	}
}

async function moveHashedImages() {
	console.log(chalk.blue('Relocating hashed images...'));

	try {
		const limit = pLimit(200);
		const files = await fs.readdir(assetsPath);

		await fs.mkdir(imagesPath, { recursive: true });

		if (files.length > 0) {
			await Promise.all(
				files.map((file) =>
					limit(async () => {
						if (processedImagePattern.test(file)) {
							await fs.rename(path.join(assetsPath, file), path.join(imagesPath, file));

							if (verbose) console.log(chalk.yellow(`Relocated: ${file}`));
						} else if (allImagePattern.test(file)) {
							console.log(chalk.red(`Failed to relocate image: ${file}`));
						}
					}),
				),
			);
		} else {
			console.log(chalk.yellow('No hashed images to relocate!'));
		}
	} catch (error) {
		console.error(chalk.red('Error relocating hashed images:'), error);
		process.exit(1);
	}
}

async function transferHashedImages() {
	console.log(chalk.blue('Transferring hashed images...'));

	try {
		await (dryRun
			? $`rsync -avz -e "ssh -i ${sshKeyPath}" --delete-after --checksum ${imagesPath}/ ${remoteHostImages}/ --dry-run`
			: $`rsync -avz -e "ssh -i ${sshKeyPath}" --delete-after --checksum ${imagesPath}/ ${remoteHostImages}/`);

		console.log(chalk.green('Hashed images transferred.'));
	} catch (error) {
		console.error(chalk.red('Error transferring hashed images:'), error);
		process.exit(1);
	}
}

async function transferApp() {
	console.log(chalk.blue('Transferring app files...'));

	try {
		await (dryRun
			? $`rsync -avz -e "ssh -i ${sshKeyPath}" ${distPath}/ ${remoteHostApp}/ --delete-after --dry-run`
			: $`rsync -avz -e "ssh -i ${sshKeyPath}" ${distPath}/ ${remoteHostApp}/ --delete-after`);
		console.log(chalk.green('App files transferred.'));
	} catch (error) {
		console.error(chalk.red('Error transferring app files:'), error);
		process.exit(1);
	}
}

const step = positionals[0] ?? 'deploy';

console.log(chalk.blue(`Deploying with arguments "${chalk.underline(step)}"...`));

switch (step) {
	case 'validate': {
		await contentValidate();
		break;
	}
	case 'related': {
		await contentRelated();
		break;
	}
	case 'build': {
		await buildProject();
		break;
	}
	case 'remove-original-images': {
		if (!imageRemote) await removeOriginalImages();
		break;
	}
	case 'move-images': {
		await moveHashedImages();
		break;
	}
	case 'transfer-images': {
		await transferHashedImages();
		break;
	}
	case 'transfer-app': {
		await transferApp();
		break;
	}
	case 'transfer': {
		await transferHashedImages();
		await transferApp();
		break;
	}
	default: {
		await contentValidate();
		await contentRelated();
		await buildProject();
		if (!imageRemote) await removeOriginalImages();
		await moveHashedImages();
		await transferHashedImages();
		await transferApp();
		break;
	}
}
