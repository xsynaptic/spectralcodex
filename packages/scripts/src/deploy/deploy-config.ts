import { log, UserError } from '@xsynaptic/astro-scripts';

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
	'DEPLOY_REMOTE_HOST=deploy@your-server.com',
	'DEPLOY_SSH_KEY_PATH=/path/to/ssh/key (optional)',
	'DEPLOY_REMOTE_PATH=/opt/server',
	'DEPLOY_SITE_PATH=/var/www/spectralcodex',
	'PROD_SERVER_URL=https://example.com/',
	'DEPLOY_MEDIA_PATH=/srv/spectralcodex',
	'IMAGE_BASE_URL=https://img.example.com',
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
	log.step('Deploy configuration');
	log.summary([
		['Remote', config.remoteHost],
		['Remote path', config.remotePath],
		['Site path', config.sitePath],
		['Site URL', config.siteUrl],
		['Media path', config.mediaPath],
		['Images path', config.imagesPath],
		['Image URL', config.imageBaseUrl],
	]);
}

export function requireEnv(name: string): string {
	const value = process.env[name];
	if (!value) {
		throw new UserError(`Missing required environment variable: ${name}`);
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

	log.detail('Example .env configuration:');

	for (const line of exampleEnvLines) {
		log.detail(`  ${line}`);
	}

	throw new UserError(`Missing required environment variables: ${missing.join(', ')}`);
}
