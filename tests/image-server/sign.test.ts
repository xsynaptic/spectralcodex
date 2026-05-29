import { describe, expect, test } from 'vitest';

import { signImageServerPath } from '#lib/image/image-sign.ts';

describe('signImageServerPath', () => {
	// Canonical test vector from docs.imagor.net/security
	test('matches docs.imagor.net canonical example byte-for-byte', () => {
		const path = '500x500/top/raw.githubusercontent.com/cshum/imagor/master/testdata/gopher.png';
		expect(signImageServerPath(path, 'mysecret', 40)).toBe(
			'IGEn3TxngivD0jy4uuiZim2bdUCvhcnVi1Nm0xGy',
		);
	});

	test('different secret produces different signature', () => {
		const path = '800x0/photo.jpg';
		expect(signImageServerPath(path, 'a', 40)).not.toBe(signImageServerPath(path, 'b', 40));
	});

	test('signatureLength of 20 returns 20-char signature', () => {
		expect(signImageServerPath('800x0/photo.jpg', 'secret', 20)).toHaveLength(20);
	});

	test('signature is url-safe base64 (no + / =)', () => {
		const sig = signImageServerPath('800x0/photo.jpg', 'secret', 40);
		expect(sig).not.toMatch(/[+/=]/);
	});
});
