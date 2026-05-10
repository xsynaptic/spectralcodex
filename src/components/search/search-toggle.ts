import type { Instance, PagefindModal, PagefindSearchResult } from '@pagefind/component-ui';

import { getInstanceManager } from '@pagefind/component-ui';

const isMac = typeof navigator !== 'undefined' && /mac/i.test(navigator.userAgent);

/** Wait for the user to stop typing before recording their query */
const SEARCH_QUERY_DEBOUNCE_MS = 1500;
const SEARCH_QUERY_MIN_LENGTH = 2;

/** Cap the value sent to analytics */
const SEARCH_QUERY_MAX_LENGTH = 100;

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

		const query = instance.searchTerm
			.replaceAll(/\s+/g, ' ')
			.trim()
			.slice(0, SEARCH_QUERY_MAX_LENGTH);

		if (query.length < SEARCH_QUERY_MIN_LENGTH) return;

		const resultCount = getResultCount(result);
		const queryWithCount =
			resultCount === undefined ? query : `${query} (${resultCount.toString()})`;

		debounceTimer = setTimeout(() => {
			window.umami?.track('search-query', { query, queryWithCount });
		}, SEARCH_QUERY_DEBOUNCE_MS);
	});
}

/* An icon-based modal trigger integrating with Pagefind's instance API */
class SearchToggle extends HTMLElement {
	// eslint-disable-next-line unicorn/no-null -- matches Pagefind's PagefindComponent interface
	instance: Instance | null = null;
	// eslint-disable-next-line unicorn/no-null -- matches Pagefind's PagefindComponent interface
	buttonEl: HTMLButtonElement | null = null;

	#handleClick = () => {
		const [modal] = (this.instance?.getUtilities('modal') ?? []) as Array<PagefindModal>;
		modal?.open();
	};

	#handleKeydown = (event: KeyboardEvent) => {
		const modifier = isMac ? event.metaKey : event.ctrlKey;

		if (!modifier || event.key.toLowerCase() !== 'k') return;

		const target = event.target as HTMLElement;

		if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
			return;
		}

		event.preventDefault();
		this.#handleClick();
	};

	/** Called by <pagefind-modal> when it closes. Matches the built-in trigger's contract. */
	handleModalClose() {
		this.buttonEl?.setAttribute('aria-expanded', 'false');
		this.buttonEl?.focus();
	}

	connectedCallback() {
		this.buttonEl = this.querySelector('button');

		if (this.buttonEl) {
			this.buttonEl.setAttribute('aria-haspopup', 'dialog');
			this.buttonEl.setAttribute('aria-expanded', 'false');
			this.buttonEl.setAttribute('aria-keyshortcuts', isMac ? 'Meta+K' : 'Control+K');
		}

		const instanceName = this.getAttribute('instance') ?? 'default';

		this.instance = getInstanceManager().getInstance(instanceName);

		registerSearchAnalytics(this.instance);

		this.instance.registerUtility(this, 'modal-trigger', { keyboardNavigation: true });

		this.instance.registerShortcut(
			{ label: isMac ? '⌘K' : 'Ctrl+K', description: 'open search' },
			this,
		);

		this.addEventListener('click', this.#handleClick);
		document.addEventListener('keydown', this.#handleKeydown);
	}

	disconnectedCallback() {
		this.instance?.deregisterAllShortcuts(this);
		this.removeEventListener('click', this.#handleClick);
		document.removeEventListener('keydown', this.#handleKeydown);
	}
}

customElements.define('search-toggle', SearchToggle);

declare global {
	interface HTMLElementTagNameMap {
		'search-toggle': SearchToggle;
	}
	interface Window {
		umami?: { track: (eventName: string, eventData?: Record<string, unknown>) => void };
	}
}
