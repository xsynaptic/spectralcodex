import { execSync } from 'node:child_process';
import path from 'node:path';

const IMAGE_SERVER_SECRET =
	process.env.IMAGE_SERVER_SECRET ?? 'dev-secret-do-not-use-in-production';

const projectRoot = path.resolve(import.meta.dirname, '../..');
const dockerComposeFile = path.resolve(
	projectRoot,
	'packages/scripts/src/dev-server/docker-compose.yml',
);
const healthUrl = 'http://localhost:3100/health';
const maxWaitMs = 30_000;
const pollIntervalMs = 500;

async function didBecomeHealthy(url: string, maxWait: number): Promise<boolean> {
	const start = Date.now();

	while (Date.now() - start < maxWait) {
		try {
			const response = await fetch(url);
			if (response.ok) {
				return true;
			}
		} catch {
			// Server not ready yet
		}
		await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
	}

	return false;
}

async function isDockerRunning(): Promise<boolean> {
	try {
		const response = await fetch(healthUrl);
		return response.ok;
	} catch {
		return false;
	}
}

export async function setup() {
	// Fail if containers already running - tests need fresh containers with known config
	if (await isDockerRunning()) {
		console.error('[Test] ERROR: Docker containers already running on port 3100');
		console.error(
			'[Test] Stop them first: docker compose -f packages/scripts/src/dev-server/docker-compose.yml --project-directory . down',
		);
		throw new Error(
			'Docker containers already running - cannot run tests with unknown configuration',
		);
	}

	console.log('[Test] Starting Docker containers...');

	// Start containers in detached mode
	// Note: --project-directory is required because docker-compose.yml uses relative paths
	try {
		execSync(
			`docker compose -f "${dockerComposeFile}" --project-directory "${projectRoot}" up -d`,
			{
				cwd: projectRoot,
				stdio: 'pipe',
				env: {
					...process.env,
					// Absolute paths required for Docker
					CONTENT_MEDIA_PATH: path.resolve(projectRoot, 'packages/content-demo/media'),
					IMAGE_SERVER_NGINX_CONFIG: path.resolve(projectRoot, 'deploy/nginx.conf.template'),
					IMAGE_SERVER_SECRET,
				},
			},
		);
	} catch (error) {
		console.error('[Test] Failed to start Docker containers');
		throw error;
	}

	console.log('[Test] Waiting for health check...');

	const isHealthy = await didBecomeHealthy(healthUrl, maxWaitMs);

	if (!isHealthy) {
		try {
			const logs = execSync(
				`docker compose -f "${dockerComposeFile}" --project-directory "${projectRoot}" logs --tail=50`,
				{
					cwd: projectRoot,
					encoding: 'utf8',
				},
			);
			console.error('[Test] Container logs:\n', logs);
		} catch {
			// Ignore log errors
		}

		throw new Error(`[Test] Health check failed after ${String(maxWaitMs)}ms`);
	}

	console.log('[Test] Docker containers ready');
}

export function teardown() {
	console.log('[Test] Stopping Docker containers...');

	try {
		execSync(`docker compose -f "${dockerComposeFile}" --project-directory "${projectRoot}" down`, {
			cwd: projectRoot,
			stdio: 'pipe',
			env: {
				...process.env,
				CONTENT_MEDIA_PATH: path.resolve(projectRoot, 'packages/content-demo/media'),
				IMAGE_SERVER_NGINX_CONFIG: path.resolve(projectRoot, 'deploy/nginx.conf.template'),
			},
		});
		console.log('[Test] Docker containers stopped');
	} catch {
		console.error('[Test] Failed to stop Docker containers');
	}
}
