import chalk from 'chalk';

export interface DeployConfig {
	imageBaseUrl: string;
	imagesPath: string;
	mediaPath: string;
	remoteHost: string;
	remotePath: string;
	sitePath: string;
	siteUrl: string;
	sshKeyPath?: string;
}

const requiredEnvVars = [
	'DEPLOY_REMOTE_HOST',
	'DEPLOY_REMOTE_PATH',
	'DEPLOY_SITE_PATH',
	'PROD_SERVER_URL',
	'DEPLOY_MEDIA_PATH',
	'IMAGE_BASE_URL',
] as const;

type RequiredEnvVar = (typeof requiredEnvVars)[number];

const exampleEnvLines = [
	'  DEPLOY_REMOTE_HOST=deploy@your-server.com',
	'  DEPLOY_SSH_KEY_PATH=/path/to/ssh/key (optional)',
	'  DEPLOY_REMOTE_PATH=/opt/server',
	'  DEPLOY_SITE_PATH=/var/www/spectralcodex',
	'  PROD_SERVER_URL=https://example.com/',
	'  DEPLOY_MEDIA_PATH=/mnt/storage/spectralcodex',
	'  IMAGE_BASE_URL=https://img.example.com',
];

export function loadDeployConfig(): DeployConfig {
	const env = readRequiredEnvVars();

	return {
		imageBaseUrl: env.IMAGE_BASE_URL.replace(/\/+$/, ''),
		imagesPath: `${env.DEPLOY_MEDIA_PATH}/img`,
		mediaPath: env.DEPLOY_MEDIA_PATH,
		remoteHost: env.DEPLOY_REMOTE_HOST,
		remotePath: env.DEPLOY_REMOTE_PATH,
		sitePath: env.DEPLOY_SITE_PATH,
		siteUrl: env.PROD_SERVER_URL,
		sshKeyPath: process.env.DEPLOY_SSH_KEY_PATH ?? '',
	};
}

export function printDeployConfig(config: DeployConfig) {
	console.log(chalk.blue('Deploy Configuration:'));
	console.log(chalk.gray(`  Remote:      ${config.remoteHost}`));
	console.log(chalk.gray(`  Remote path: ${config.remotePath}`));
	console.log(chalk.gray(`  Site path:   ${config.sitePath}`));
	console.log(chalk.gray(`  Site URL:    ${config.siteUrl}`));
	console.log(chalk.gray(`  Media path:  ${config.mediaPath}`));
	console.log(chalk.gray(`  Images path: ${config.imagesPath}`));
	console.log(chalk.gray(`  Image URL:   ${config.imageBaseUrl}`));
	console.log('');
}

export function requireEnv(name: string): string {
	const value = process.env[name];
	if (!value) {
		throw new Error(`Missing required environment variable: ${name}`);
	}
	return value;
}

function readRequiredEnvVars(): Record<RequiredEnvVar, string> {
	const values = {} as Record<RequiredEnvVar, string>;
	const missing: Array<string> = [];

	for (const name of requiredEnvVars) {
		const value = process.env[name];

		if (value) {
			values[name] = value;
		} else {
			missing.push(name);
		}
	}

	if (missing.length === 0) return values;

	const message = `Missing required environment variables: ${missing.join(', ')}`;

	console.error(chalk.red(message));
	console.error(chalk.gray('\nExample .env configuration:'));

	for (const line of exampleEnvLines) {
		console.error(chalk.gray(line));
	}

	throw new Error(message);
}
