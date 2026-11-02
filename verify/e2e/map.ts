import type { Locator } from '@playwright/test';

import { mapSettledAttribute } from '@spectralcodex/react-map-component/constants';

import { isDev } from '#e2e/constants.ts';
import { expect } from '#e2e/test.ts';

export const mapLoadTimeout = isDev ? 20_000 : 10_000;

// A pulse ring shows before MapLibre draws its Point, so a click or hover on a Point waits on this
export async function expectMapSettled(scope: Locator) {
	await expect(scope.locator(`[${mapSettledAttribute}]`)).toBeAttached({
		timeout: mapLoadTimeout,
	});
}
