import chalk from 'chalk';

interface DeployConfig {
	remoteHost: string;
	remotePath: string;
	sshKeyPath?: string;
	sitePath: string;
	mediaPath: string;
}

export function loadDeployConfig(): DeployConfig {
	const remoteHost = process.env.DEPLOY_REMOTE_HOST;
	const remotePath = process.env.DEPLOY_REMOTE_PATH;
	const sshKeyPath = process.env.DEPLOY_SSH_KEY_PATH;
	const sitePath = process.env.DEPLOY_SITE_PATH;
	const mediaPath = process.env.DEPLOY_MEDIA_PATH;

	// Validate required vars
	const missing: Array<string> = [];

	if (!remoteHost) missing.push('DEPLOY_REMOTE_HOST');
	if (!remotePath) missing.push('DEPLOY_REMOTE_PATH');
	if (!sitePath) missing.push('DEPLOY_SITE_PATH');
	if (!mediaPath) missing.push('DEPLOY_MEDIA_PATH');

	if (!remoteHost || !remotePath || !sitePath || !mediaPath) {
		console.error(chalk.red(`Missing required environment variables: ${missing.join(', ')}`));
		console.error(chalk.gray('\nExample .env configuration:'));
		console.error(chalk.gray('  DEPLOY_REMOTE_HOST=deploy@your-server.com'));
		console.error(chalk.gray('  DEPLOY_SSH_KEY_PATH=/path/to/ssh/key (optional)'));
		console.error(chalk.gray('  DEPLOY_REMOTE_PATH=/opt/server'));
		console.error(chalk.gray('  DEPLOY_SITE_PATH=/var/www/spectralcodex'));
		console.error(chalk.gray('  DEPLOY_MEDIA_PATH=/mnt/storage/spectralcodex'));
		throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
	}

	return {
		remoteHost,
		remotePath,
		sshKeyPath: sshKeyPath ?? '',
		sitePath,
		mediaPath,
	};
}

export function printDeployConfig(config: DeployConfig) {
	console.log(chalk.blue('Deploy Configuration:'));
	console.log(chalk.gray(`  Remote:      ${config.remoteHost}`));
	console.log(chalk.gray(`  Remote path: ${config.remotePath}`));
	console.log(chalk.gray(`  Site path:   ${config.sitePath}`));
	console.log(chalk.gray(`  Media path:  ${config.mediaPath}`));
	console.log('');
}
