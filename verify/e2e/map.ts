import type { Locator } from '@playwright/test';

import { mapSettledAttribute } from '@spectralcodex/react-map-component/constants';

import { isDev } from '#e2e/constants.ts';
import { expect } from '#e2e/test.ts';

export const mapLoadTimeout = isDev ? 20_000 : 10_000;

export async function expectMapSettled(scope: Locator) {
	await expect(scope.locator(`[${mapSettledAttribute}]`)).toBeAttached({
		timeout: mapLoadTimeout,
	});
}
