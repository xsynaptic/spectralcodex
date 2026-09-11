import { afterEach, describe, expect, test, vi } from 'vitest';

import { loadDeployConfig } from '#deploy/deploy-config.ts';

const completeEnv = {
	DEPLOY_REMOTE_HOST: 'deploy@host',
	DEPLOY_REMOTE_PATH: '/opt/server',
	DEPLOY_SITE_PATH: '/var/www/site',
	PROD_SERVER_URL: 'https://example.com/',
	DEPLOY_MEDIA_PATH: '/mnt/media',
	IMAGE_SERVER_URL: 'https://example.com/_img',
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

	test('maps every required variable and defaults the ssh key path to an empty string', () => {
		stubEnv({ ...completeEnv, DEPLOY_SSH_KEY_PATH: undefined });

		expect(loadDeployConfig()).toEqual({
			remoteHost: 'deploy@host',
			remotePath: '/opt/server',
			sshKeyPath: '',
			sitePath: '/var/www/site',
			siteUrl: 'https://example.com/',
			mediaPath: '/mnt/media',
			imageServerUrl: 'https://example.com/_img',
		});
	});

	test('throws listing every missing variable at once', () => {
		vi.spyOn(console, 'error').mockImplementation(noop);
		stubEnv({ ...completeEnv, DEPLOY_REMOTE_HOST: undefined, IMAGE_SERVER_URL: undefined });

		expect(() => loadDeployConfig()).toThrow(
			'Missing required environment variables: DEPLOY_REMOTE_HOST, IMAGE_SERVER_URL',
		);
	});
});
