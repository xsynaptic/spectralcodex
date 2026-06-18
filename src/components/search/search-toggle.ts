import type { Instance, PagefindModal, PagefindSearchResult } from '@pagefind/component-ui';

import { getInstanceManager } from '@pagefind/component-ui';

const isMac = typeof navigator !== 'undefined' && /mac/i.test(navigator.userAgent);

const searchQueryDebounceMs = 1500; // Wait for the user to stop typing before recording their query
const searchQueryMinLength = 2;
const searchQueryMaxLength = 100; // Cap the value sent to analytics

let searchAnalyticsRegistered = false;

function getResultCount(result: unknown): number | undefined {
	if (
		result &&
		typeof result === 'object' &&
		Array.isArray((result as PagefindSearchResult).results)
	) {
		return (result as PagefindSearchResult).results.length;
	}
	return undefined;
}

/** Record settled search queries */
function registerSearchAnalytics(instance: Instance) {
	if (searchAnalyticsRegistered) return;

	searchAnalyticsRegistered = true;

	let debounceTimer: ReturnType<typeof setTimeout> | undefined;

	instance.on('results', (result: unknown) => {
		clearTimeout(debounceTimer);

		const query = instance.searchTerm.replaceAll(/\s+/g, ' ').trim().slice(0, searchQueryMaxLength);

		if (query.length < searchQueryMinLength) return;

		const resultCount = getResultCount(result);
		const queryWithCount =
			resultCount === undefined ? query : `${query} (${resultCount.toString()})`;

		debounceTimer = setTimeout(() => {
			window.umami?.track('search-query', { query, queryWithCount });
		}, searchQueryDebounceMs);
	});
}

// An icon-based modal trigger integrating with Pagefind's instance API
class SearchToggle extends HTMLElement {
	// eslint-disable-next-line unicorn/no-null -- matches Pagefind's PagefindComponent interface
	instance: Instance | null = null;

	/** Pagefind reads this off the registered trigger to toggle aria-expanded and aria-controls */
	get buttonEl() {
		return this.querySelector<HTMLButtonElement>('button');
	}

	#cssReady?: Promise<void>;

	// Load the deferred stylesheet on intent; resolves once applied
	#ensurePagefindCss = (): Promise<void> => {
		if (this.#cssReady) return this.#cssReady;

		const href = this.dataset.pagefindCssUrl;

		if (!href) return Promise.resolve();

		this.#cssReady = new Promise((resolve) => {
			let link = document.querySelector<HTMLLinkElement>('link[data-pagefind-css]');

			if (!link) {
				link = document.createElement('link');
				link.rel = 'stylesheet';
				link.href = href;
				link.dataset.pagefindCss = '';
				document.head.append(link);
			}

			if (link.sheet) {
				resolve();
				return;
			}

			link.addEventListener(
				'load',
				() => {
					resolve();
				},
				{ once: true },
			);
			link.addEventListener(
				'error',
				() => {
					resolve();
				},
				{ once: true },
			);
		});

		return this.#cssReady;
	};

	// Void-returning wrapper so the listener ignores the preload promise
	#preloadPagefindCss = () => {
		void this.#ensurePagefindCss();
	};

	// Await the stylesheet so the modal never opens unstyled
	#handleClick = async () => {
		await this.#ensurePagefindCss();
		const [modal] = (this.instance?.getUtilities('modal') ?? []) as Array<PagefindModal>;
		modal?.open();
	};

	// Void-returning wrapper for use as a click listener
	#handleClickEvent = () => {
		void this.#handleClick();
	};

	#handleKeydown = (event: KeyboardEvent) => {
		const modifier = isMac ? event.metaKey : event.ctrlKey;

		if (!modifier || event.key.toLowerCase() !== 'k') return;

		const target = event.target as HTMLElement;

		if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
			return;
		}

		event.preventDefault();
		void this.#handleClick();
	};

	// Called by <pagefind-modal> when it closes. Matches the built-in trigger's contract
	handleModalClose() {
		this.buttonEl?.setAttribute('aria-expanded', 'false');
		this.buttonEl?.focus();
	}

	connectedCallback() {
		// Static props in markup; only the OS-dependent keyboard hint has to be set client-side
		this.buttonEl?.setAttribute('aria-keyshortcuts', isMac ? 'Meta+K' : 'Control+K');

		const instanceName = this.getAttribute('instance') ?? 'default';

		this.instance = getInstanceManager().getInstance(instanceName);

		registerSearchAnalytics(this.instance);

		// Pagefind exposes no deregisterUtility so each navigation's fresh trigger would pile up
		// The astro:before-swap handler in search.astro clears the registry to bound it; keep these two in sync
		this.instance.registerUtility(this, 'modal-trigger', { keyboardNavigation: true });

		this.instance.registerShortcut(
			{ label: isMac ? '⌘K' : 'Ctrl+K', description: 'open search' },
			this,
		);

		// Hover or focus the toggle and the stylesheet starts loading, so it's ready before the modal opens
		this.addEventListener('pointerenter', this.#preloadPagefindCss, { once: true });
		this.addEventListener('focusin', this.#preloadPagefindCss, { once: true });

		this.addEventListener('click', this.#handleClickEvent);
		document.addEventListener('keydown', this.#handleKeydown);
	}

	disconnectedCallback() {
		this.instance?.deregisterAllShortcuts(this);
		this.removeEventListener('pointerenter', this.#preloadPagefindCss);
		this.removeEventListener('focusin', this.#preloadPagefindCss);
		this.removeEventListener('click', this.#handleClickEvent);
		document.removeEventListener('keydown', this.#handleKeydown);
	}
}

if (!customElements.get('search-toggle')) {
	customElements.define('search-toggle', SearchToggle);
}

declare global {
	interface HTMLElementTagNameMap {
		'search-toggle': SearchToggle;
	}
	interface Window {
		umami?: { track: (eventName: string, eventData?: Record<string, unknown>) => void };
	}
}
