import type { Page } from '@playwright/test';

interface TrackedEvent {
	data: unknown;
	name: string;
}

export async function recordTracking(page: Page) {
	await page.addInitScript(() => {
		const tracked: Array<TrackedEvent> = [];

		Object.assign(window, {
			tracked,
			umami: {
				track: (name: string, data: unknown) => {
					tracked.push({ data, name });
				},
			},
		});
	});
}

export function getTracked(page: Page, name: string) {
	return page.evaluate(
		(eventName) =>
			((window as { tracked?: Array<TrackedEvent> }).tracked ?? []).filter(
				(event) => event.name === eventName,
			),
		name,
	);
}
