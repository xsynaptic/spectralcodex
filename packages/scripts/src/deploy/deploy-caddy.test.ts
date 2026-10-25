import { describe, expect, test } from 'vitest';

import { extractCaddyError } from '#deploy/deploy-caddy.ts';

const usingConfigLine =
	'{"level":"info","ts":1792905106.9987805,"msg":"using config from file","file":"/etc/caddy/Caddyfile"}';

describe('extractCaddyError', () => {
	test('keeps only the error entry from caddy validate output', () => {
		const stderr = [
			usingConfigLine,
			'{"level":"error","ts":1792905106.999937,"msg":"adapting config using caddyfile: /etc/caddy/Caddyfile:2: unrecognized directive: bogus_directive"}',
			'',
		].join('\n');

		expect(extractCaddyError(stderr)).toBe(
			'adapting config using caddyfile: /etc/caddy/Caddyfile:2: unrecognized directive: bogus_directive',
		);
	});

	test('passes through plain lines from docker or ssh', () => {
		const stderr = [
			'docker: Error response from daemon: pull access denied for caddy, repository does not exist.',
			"Run 'docker run --help' for more information",
		].join('\n');

		expect(extractCaddyError(stderr)).toBe(stderr);
	});

	test('returns nothing when caddy logged no error', () => {
		expect(extractCaddyError(`${usingConfigLine}\n`)).toBe('');
	});
});
