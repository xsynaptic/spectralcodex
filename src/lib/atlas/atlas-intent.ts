import {
	mapControlEventName,
	mapOpenEventName,
} from '@spectralcodex/react-map-component/constants';
import { navigate } from 'astro:transitions/client';

import {
	atlasInlineMapSelector,
	atlasPaneSelector,
	atlasReturnStorageKey,
	atlasSheetRest,
	atlasShellSelector,
} from '#lib/atlas/atlas-constants.ts';
import { getAtlasOpenAction } from '#lib/atlas/atlas-layout-factory.ts';
import { readAtlasLayout, readAtlasScreen, setFlag } from '#lib/atlas/atlas-mode.ts';
import {
	moveSheet,
	readPreferredSheetRest,
	readSheetEnterRest,
	readSheetRest,
	scrollToSheetStart,
	setSheet,
} from '#lib/atlas/atlas-sheet.ts';
import { getSitePath } from '#lib/utils/routing.ts';

function openSheet() {
	const rest = readSheetEnterRest();

	if (rest === atlasSheetRest.down) {
		void moveSheet(rest);
		return;
	}

	const inlineMap = document.querySelector(atlasInlineMapSelector);
	const next = inlineMap?.nextElementSibling ?? inlineMap?.parentElement?.nextElementSibling;

	setSheet(rest);

	if (next) scrollToSheetStart('instant', next);
}

function openAtlas() {
	if (document.fullscreenElement) void document.exitFullscreen();

	setFlag(true);

	document.querySelector<HTMLElement>(atlasShellSelector)?.focus({ preventScroll: true });

	if (readAtlasLayout() === 'sheet') {
		openSheet();
		return;
	}

	window.scrollTo({ behavior: 'instant', top: 0 });
}

function runOpenAction(action: ReturnType<typeof getAtlasOpenAction>) {
	switch (action.type) {
		case 'navigate': {
			void navigate(action.url);
			break;
		}
		case 'raise': {
			void moveSheet(readPreferredSheetRest());
			break;
		}
		case 'start': {
			scrollToSheetStart('smooth');
			break;
		}
		case 'top': {
			window.scrollTo({ top: 0 });
			break;
		}
	}
}

function storeReturnPath() {
	if (readAtlasLayout() === 'map') return;

	try {
		sessionStorage.setItem(atlasReturnStorageKey, location.pathname + location.search);
	} catch {
		// sessionStorage unavailable
	}
}

function readReturnPath() {
	try {
		return sessionStorage.getItem(atlasReturnStorageKey) ?? undefined;
	} catch {
		// sessionStorage unavailable
		return;
	}
}

function leaveMap() {
	if ('navigation' in globalThis && navigation.canGoBack) {
		history.back();
		return;
	}

	void navigate(readReturnPath() ?? getSitePath(), { history: 'replace' });
}

async function closeAtlas() {
	if (readSheetRest() === atlasSheetRest.down) await moveSheet(atlasSheetRest.raised);

	const hasShellFocus = document
		.querySelector(atlasShellSelector)
		?.contains(document.activeElement);

	const layout = readAtlasLayout();

	setFlag(false);

	if (layout !== 'map') {
		if (hasShellFocus) {
			document.querySelector<HTMLElement>(atlasPaneSelector)?.focus({ preventScroll: true });
		}

		return;
	}

	leaveMap();
}

export function startAtlasIntents() {
	document.addEventListener(mapOpenEventName, (event) => {
		runOpenAction(
			getAtlasOpenAction({
				pathname: location.pathname,
				screen: readAtlasScreen(),
				url: event.detail.url,
			}),
		);
	});

	document.addEventListener(mapControlEventName, ({ detail: { name } }) => {
		switch (name) {
			case 'enter': {
				openAtlas();
				break;
			}
			case 'exit': {
				void closeAtlas();
				break;
			}
			case 'expand': {
				void navigate(getSitePath('atlas'));
				break;
			}
		}
	});

	document.addEventListener('astro:page-load', storeReturnPath);
}
