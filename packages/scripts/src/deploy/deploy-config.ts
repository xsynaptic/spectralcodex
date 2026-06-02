import chalk from 'chalk';

export interface DeployConfig {
	remoteHost: string;
	remotePath: string;
	sshKeyPath?: string;
	sitePath: string;
	siteUrl: string;
	mediaPath: string;
	imageServerUrl: string;
}

export function loadDeployConfig(): DeployConfig {
	const remoteHost = process.env.DEPLOY_REMOTE_HOST;
	const remotePath = process.env.DEPLOY_REMOTE_PATH;
	const sshKeyPath = process.env.DEPLOY_SSH_KEY_PATH;
	const sitePath = process.env.DEPLOY_SITE_PATH;
	const siteUrl = process.env.PROD_SERVER_URL;
	const mediaPath = process.env.DEPLOY_MEDIA_PATH;
	const imageServerUrl = process.env.IMAGE_SERVER_URL;

	// Validate required vars
	const missing: Array<string> = [];

	if (!remoteHost) missing.push('DEPLOY_REMOTE_HOST');
	if (!remotePath) missing.push('DEPLOY_REMOTE_PATH');
	if (!sitePath) missing.push('DEPLOY_SITE_PATH');
	if (!siteUrl) missing.push('PROD_SERVER_URL');
	if (!mediaPath) missing.push('DEPLOY_MEDIA_PATH');
	if (!imageServerUrl) missing.push('IMAGE_SERVER_URL');

	if (!remoteHost || !remotePath || !sitePath || !siteUrl || !mediaPath || !imageServerUrl) {
		console.error(chalk.red(`Missing required environment variables: ${missing.join(', ')}`));
		console.error(chalk.gray('\nExample .env configuration:'));
		console.error(chalk.gray('  DEPLOY_REMOTE_HOST=deploy@your-server.com'));
		console.error(chalk.gray('  DEPLOY_SSH_KEY_PATH=/path/to/ssh/key (optional)'));
		console.error(chalk.gray('  DEPLOY_REMOTE_PATH=/opt/server'));
		console.error(chalk.gray('  DEPLOY_SITE_PATH=/var/www/spectralcodex'));
		console.error(chalk.gray('  PROD_SERVER_URL=https://example.com/'));
		console.error(chalk.gray('  DEPLOY_MEDIA_PATH=/mnt/storage/spectralcodex'));
		console.error(chalk.gray('  IMAGE_SERVER_URL=https://example.com/_img'));
		throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
	}

	return {
		remoteHost,
		remotePath,
		sshKeyPath: sshKeyPath ?? '',
		sitePath,
		siteUrl,
		mediaPath,
		imageServerUrl,
	};
}

export function printDeployConfig(config: DeployConfig) {
	console.log(chalk.blue('Deploy Configuration:'));
	console.log(chalk.gray(`  Remote:      ${config.remoteHost}`));
	console.log(chalk.gray(`  Remote path: ${config.remotePath}`));
	console.log(chalk.gray(`  Site path:   ${config.sitePath}`));
	console.log(chalk.gray(`  Site URL:    ${config.siteUrl}`));
	console.log(chalk.gray(`  Media path:  ${config.mediaPath}`));
	console.log(chalk.gray(`  Image URL:   ${config.imageServerUrl}`));
	console.log('');
}
