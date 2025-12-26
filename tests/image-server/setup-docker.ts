/**
 * Vitest global setup; starts Docker containers for integration tests
 */
import { execSync } from 'node:child_process';
import path from 'node:path';

const PROJECT_ROOT = path.resolve(import.meta.dirname, '../..');
const DOCKER_COMPOSE_FILE = path.resolve(
	PROJECT_ROOT,
	'packages/scripts/src/dev-server/docker-compose.yml',
);
const HEALTH_URL = 'http://localhost:3100/health';
const MAX_WAIT_MS = 30_000;
const POLL_INTERVAL_MS = 500;

// Test secret; must match the value used in integration.test.ts
const TEST_SECRET = 'dev-secret-do-not-use-in-production';

async function waitForHealth(url: string, maxWait: number): Promise<boolean> {
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
		await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
	}

	return false;
}

async function isDockerRunning(): Promise<boolean> {
	try {
		const response = await fetch(HEALTH_URL);
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
			`docker compose -f "${DOCKER_COMPOSE_FILE}" --project-directory "${PROJECT_ROOT}" up -d`,
			{
				cwd: PROJECT_ROOT,
				stdio: 'pipe',
				env: {
					...process.env,
					// Use content-demo for tests (has dedicated test images)
					CONTENT_MEDIA_PATH: 'packages/content-demo/media',
					// Use known test secret for predictable signature validation
					IPX_SERVER_SECRET: TEST_SECRET,
				},
			},
		);
	} catch (error) {
		console.error('[Test] Failed to start Docker containers');
		throw error;
	}

	// Wait for health check
	console.log('[Test] Waiting for health check...');

	const healthy = await waitForHealth(HEALTH_URL, MAX_WAIT_MS);

	if (!healthy) {
		try {
			const logs = execSync(
				`docker compose -f "${DOCKER_COMPOSE_FILE}" --project-directory "${PROJECT_ROOT}" logs --tail=50`,
				{
					cwd: PROJECT_ROOT,
					encoding: 'utf8',
				},
			);
			console.error('[Test] Container logs:\n', logs);
		} catch {
			// Ignore log errors
		}

		throw new Error(`[Test] Health check failed after ${String(MAX_WAIT_MS)}ms`);
	}

	console.log('[Test] Docker containers ready');
}

export function teardown() {
	// Always stop containers to ensure clean state for next run
	console.log('[Test] Stopping Docker containers...');

	try {
		execSync(
			`docker compose -f "${DOCKER_COMPOSE_FILE}" --project-directory "${PROJECT_ROOT}" down`,
			{
				cwd: PROJECT_ROOT,
				stdio: 'pipe',
			},
		);
		console.log('[Test] Docker containers stopped');
	} catch {
		console.error('[Test] Failed to stop Docker containers');
	}
}
