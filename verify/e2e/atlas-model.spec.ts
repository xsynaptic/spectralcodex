import type { Page } from '@playwright/test';

import { readFileSync } from 'node:fs';

import {
	allowReloadNoise,
	getAtlas,
	getHeading,
	getPreviewLink,
	phoneViewport,
} from '#e2e/atlas.ts';
import { paths } from '#e2e/constants.ts';
import { expect, test, visit } from '#e2e/test.ts';
import {
	atlasFlagAttribute,
	atlasFlagStorageKey,
	atlasPageAttribute,
	atlasSheetAttribute,
	atlasSheetRest,
	atlasSheetRestStorageKey,
} from '#lib/atlas/atlas-constants.ts';

const witnessFile = 'verify/models/atlas/witness.tla';
const witnessRowPattern = /\[step \|-> "(\w+)",\s*seen \|-> \[([^\]]*)\]\]/g;
const witnessFieldPattern = /(\w+) \|-> ("[^"]*"|TRUE|FALSE)/g;

function readTlaValue(value: string) {
	if (value === 'TRUE') return true;
	if (value === 'FALSE') return false;

	return value.slice(1, -1);
}

function readWitnessPath() {
	const text = readFileSync(witnessFile, 'utf8');
	const witnessPath: Array<{ seen: Record<string, boolean | string>; step: string }> = [];

	for (const [, step = '', fields = ''] of text.matchAll(witnessRowPattern)) {
		const seen: Record<string, boolean | string> = {};

		for (const [, key = '', value = ''] of fields.matchAll(witnessFieldPattern)) {
			seen[key] = readTlaValue(value);
		}

		witnessPath.push({ seen, step });
	}

	return witnessPath;
}

function readObserved(page: Page) {
	return page.evaluate(
		({ flagAttribute, flagKey, half, pageAttribute, restKey, sheetAttribute }) => {
			const root = document.documentElement;

			return {
				atlas: root.hasAttribute(flagAttribute),
				page: root.getAttribute(pageAttribute) ?? '',
				sheet: root.getAttribute(sheetAttribute) ?? '',
				stored: localStorage.getItem(restKey) ?? half,
				tab: sessionStorage.getItem(flagKey) ?? '',
			};
		},
		{
			flagAttribute: atlasFlagAttribute,
			flagKey: atlasFlagStorageKey,
			half: atlasSheetRest.half,
			pageAttribute: atlasPageAttribute,
			restKey: atlasSheetRestStorageKey,
			sheetAttribute: atlasSheetAttribute,
		},
	);
}

// History moves the address before the swap and the page attribute stays put, so the heading marks the arrival
async function openAnotherPlace(page: Page) {
	const heading = await getHeading(page);

	await getPreviewLink(page).click();
	await expect(page.locator('h1')).not.toHaveText(heading);
}

const acts: Array<{ act: (page: Page) => Promise<unknown>; step: string }> = [
	{ act: (page) => visit(page, `${paths.regionDetail}?atlas`), step: 'Init' },
	{ act: (page) => getAtlas(page).handle.press('ArrowUp'), step: 'YouMoveTheSheet' },
	{ act: openAnotherPlace, step: 'YouFollowALink' },
	{ act: (page) => page.reload({ waitUntil: 'domcontentloaded' }), step: 'YouReload' },
	{ act: (page) => getAtlas(page).handle.press('ArrowDown'), step: 'YouMoveTheSheet' },
	{ act: (page) => getAtlas(page).handle.click(), step: 'YouMoveTheSheet' },
	{ act: (page) => getAtlas(page).close.click(), step: 'YouPressClose' },
];

test.describe('the Atlas model on a phone viewport', { tag: '@engines' }, () => {
	test.use({ viewport: phoneViewport });

	test('the witness path replays in the browser with the same observables', async ({
		browserName,
		consoleGuard,
		page,
	}) => {
		const witnessPath = readWitnessPath();

		allowReloadNoise(consoleGuard, browserName);
		expect(witnessPath.map(({ step }) => step)).toEqual(acts.map(({ step }) => step));

		for (const [index, { act, step }] of acts.entries()) {
			await act(page);
			await expect
				.poll(() => readObserved(page), { message: step })
				.toEqual(witnessPath[index]?.seen);
		}
	});
});
