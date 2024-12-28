/* eslint-disable unicorn/no-process-exit */
import chalk from 'chalk';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import pLimit from 'p-limit';
import { $ } from 'zx';

const distPath = './dist';
const clientPath = path.join(distPath, 'client');
const serverPath = path.join(distPath, 'server');
const assetsPath = path.join(clientPath, process.env.BUILD_ASSETS_PATH ?? '_x');
const imagesPath = path.join(distPath, 'images');

const remoteHostApp = process.env.DEPLOY_REMOTE_HOST_APP ?? 'user@remote-server:/path/to/app';
const remoteHostImages =
	process.env.DEPLOY_REMOTE_HOST_IMAGES ?? 'user@remote-server:/path/to/images';
const sshKeyPath = process.env.DEPLOY_SSH_KEY_PATH;

const originalImagePattern = /^[\w#$%+=@~-]+\.[\w-]{8}\.(avif|gif|jpg|jpeg|png|webp)$/i;
const processedImagePattern = /^[\w#$%+=@~-]+\.[\w-]{8}_[\w-]+\.(avif|gif|jpg|jpeg|png|webp)$/i;

const dryRun = process.argv.includes('--dry-run');
const skipBuild = process.argv.includes('--skip-build');

// Output shell command results
$.verbose = true;

async function buildProject() {
	if (skipBuild) {
		console.log(chalk.yellow('Skipping build...'));
		return;
	}
	console.log(chalk.blue('Building Astro project...'));

	try {
		await $`pnpm astro build`;
		console.log(chalk.green('Build completed.'));
	} catch (error) {
		console.error(chalk.red('Error during build:'), error);
		process.exit(1);
	}
}

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

							console.log(chalk.yellow(`Removed: ${file}`));
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

							console.log(chalk.yellow(`Relocated: ${file}`));
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
		await $`rsync -avz -e "ssh -i ${sshKeyPath}" --delete-after --checksum ${imagesPath}/ ${remoteHostImages}/ ${dryRun ? '--dry-run' : ''}`;

		console.log(chalk.green('Hashed images transferred.'));
	} catch (error) {
		console.error(chalk.red('Error transferring hashed images:'), error);
		process.exit(1);
	}
}

async function transferApp() {
	console.log(chalk.blue('Transferring app files...'));

	// Note: these directories need to exist on the remote server
	// TODO: restore --delete-after
	try {
		await $`rsync -avz -e "ssh -i ${sshKeyPath}" ${clientPath}/ ${remoteHostApp}/dist/client/ ${dryRun ? '--dry-run' : ''}`;
		await $`rsync -avz -e "ssh -i ${sshKeyPath}" ${serverPath}/ ${remoteHostApp}/dist/server/ ${dryRun ? '--dry-run' : ''}`;
		await $`rsync -avz -e "ssh -i ${sshKeyPath}" ./.dockerignore ./.env ./Dockerfile ./docker-compose.yaml ./docker-compose.prod.yaml ./package.json ./pnpm-lock.yaml ${remoteHostApp}/ ${dryRun ? '--dry-run' : ''}`;
		console.log(chalk.green('App files transferred.'));
	} catch (error) {
		console.error(chalk.red('Error transferring app files:'), error);
		process.exit(1);
	}
}

async function deploy() {
	await buildProject();
	await removeOriginalImages();
	await moveHashedImages();
	await transferHashedImages();
	await transferApp();
}

const step = process.argv[2] ?? 'deploy';

console.log(chalk.blue(`Deploying with arguments "${chalk.underline(step)}"...`));

switch (step) {
	case 'build': {
		await buildProject();
		break;
	}
	case 'remove-images': {
		await removeOriginalImages();
		break;
	}
	case 'relocate-images': {
		await moveHashedImages();
		break;
	}
	case 'staging': {
		await buildProject();
		await removeOriginalImages();
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
	default: {
		await deploy();
		break;
	}
}
