import { afterEach, describe, expect, test, vi } from 'vitest';

import { loadDeployConfig } from '#deploy/deploy-config.ts';

const completeEnv = {
	DEPLOY_MEDIA_PATH: '/mnt/media',
	DEPLOY_REMOTE_HOST: 'deploy@host',
	DEPLOY_REMOTE_PATH: '/opt/server',
	DEPLOY_SITE_PATH: '/var/www/site',
	IMAGE_BASE_URL: 'https://img.example.com/',
	PROD_SERVER_URL: 'https://example.com/',
};

function noop() {
	// Silences the config error banner so a failing assertion is the only output
}

function stubEnv(values: Record<string, string | undefined>) {
	for (const [name, value] of Object.entries(values)) {
		vi.stubEnv(name, value);
	}
}

describe('loadDeployConfig', () => {
	afterEach(() => {
		vi.unstubAllEnvs();
		vi.restoreAllMocks();
	});

	test('maps every required variable, trims the image base URL, and defaults the ssh key path', () => {
		stubEnv({ ...completeEnv, DEPLOY_SSH_KEY_PATH: undefined });

		expect(loadDeployConfig()).toEqual({
			imageBaseUrl: 'https://img.example.com',
			imagesPath: '/mnt/media/img',
			mediaPath: '/mnt/media',
			remoteHost: 'deploy@host',
			remotePath: '/opt/server',
			sitePath: '/var/www/site',
			siteUrl: 'https://example.com/',
			sshKeyPath: '',
		});
	});

	test('throws listing every missing variable at once', () => {
		vi.spyOn(console, 'error').mockImplementation(noop);
		stubEnv({ ...completeEnv, DEPLOY_REMOTE_HOST: undefined, IMAGE_BASE_URL: undefined });

		expect(() => loadDeployConfig()).toThrow(
			'Missing required environment variables: DEPLOY_REMOTE_HOST, IMAGE_BASE_URL',
		);
	});
});
