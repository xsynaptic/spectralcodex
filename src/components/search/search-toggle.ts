import type {
	getInstanceManager,
	Instance,
	PagefindModal,
	PagefindModalTrigger,
} from '@pagefind/component-ui';
import type { SearchTracker } from '@spectralcodex/shared/search-tracker';

import { createSearchTracker } from '@spectralcodex/shared/search-tracker';

const isMac = typeof navigator !== 'undefined' && /mac/i.test(navigator.userAgent);

// Pagefind reads these by name off a registered modal-trigger; a rename fails silently without this
type ModalTriggerContract = Pick<PagefindModalTrigger, 'buttonEl' | 'handleModalClose'>;

interface PagefindMatch {
	matchedMetaFields?: Array<string>;
	words: Array<number>;
}

const imageMetaFields = new Set(['image', 'image_2x']);

const searchTrackers = new WeakMap<Instance, SearchTracker>();

let instanceManager: ReturnType<typeof getInstanceManager> | undefined;

class SearchToggle extends HTMLElement implements ModalTriggerContract {
	// eslint-disable-next-line unicorn/no-null -- matches Pagefind's PagefindComponent interface
	instance: Instance | null = null;

	get buttonEl() {
		return this.querySelector<HTMLButtonElement>('button');
	}

	#controller: AbortController | undefined;
	#cssReady?: Promise<void>;
	#searchTracker: SearchTracker | undefined;

	connectedCallback() {
		this.#controller = new AbortController();

		const { signal } = this.#controller;

		// Static props in markup; only the OS-dependent keyboard hint has to be set client-side
		this.buttonEl?.setAttribute('aria-keyshortcuts', isMac ? 'Meta+K' : 'Control+K');

		this.addEventListener('pointerenter', this.#preloadPagefind, { once: true, signal });
		this.addEventListener('focusin', this.#preloadPagefind, { once: true, signal });

		this.addEventListener('click', this.#handleClickEvent, { signal });
		document.addEventListener('keydown', this.#handleKeydown, { signal });

		// Ends the search before the result link's navigation closes the modal
		document.addEventListener('click', this.#handleResultClick, { capture: true, signal });
	}

	disconnectedCallback() {
		this.instance?.deregisterAllShortcuts(this);
		// eslint-disable-next-line unicorn/no-null -- matches Pagefind's PagefindComponent interface
		this.instance = null;
		this.#searchTracker = undefined;
		this.#controller?.abort();
		this.#controller = undefined;
	}

	// Invoked by <pagefind-modal> on close, never from this file
	handleModalClose() {
		this.#searchTracker?.end(false);
		this.buttonEl?.setAttribute('aria-expanded', 'false');
		this.buttonEl?.focus();
	}

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

	// Importing defines the <pagefind-*> elements, which upgrade and register themselves before this resolves
	#ensurePagefindRegistered = async (): Promise<void> => {
		const pagefind = await import('@pagefind/component-ui');

		instanceManager = pagefind.getInstanceManager();

		if (this.instance || !this.#controller) return;

		this.instance = instanceManager.getInstance(this.getAttribute('instance') ?? 'default');

		this.#searchTracker = getSearchTracker(this.instance);

		this.instance.registerUtility(this, 'modal-trigger', { keyboardNavigation: true });

		this.instance.registerShortcut(
			{ description: this.dataset.shortcutDescription ?? '', label: isMac ? '⌘K' : 'Ctrl+K' },
			this,
		);
	};

	// Await the stylesheet and registration so the modal never opens unstyled or unregistered
	#handleClick = async () => {
		await Promise.all([this.#ensurePagefindCss(), this.#ensurePagefindRegistered()]);
		const [modal] = (this.instance?.getUtilities('modal') ?? []) as Array<PagefindModal>;
		modal?.open();
	};

	#handleClickEvent = () => {
		void this.#handleClick();
	};

	#handleKeydown = (event: KeyboardEvent) => {
		const isModifier = isMac ? event.metaKey : event.ctrlKey;

		if (!isModifier || event.key.toLowerCase() !== 'k') return;

		const target = event.target as HTMLElement;

		if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
			return;
		}

		event.preventDefault();
		void this.#handleClick();
	};

	#handleResultClick = (event: MouseEvent) => {
		if (!(event.target instanceof Element)) return;
		if (!event.target.closest('pagefind-results a[href]')) return;

		this.#searchTracker?.end(true);
	};

	#preloadPagefind = () => {
		void this.#ensurePagefindCss();
		void this.#ensurePagefindRegistered();
	};
}

function getResultCount(result: unknown): number | undefined {
	if (!result || typeof result !== 'object') return undefined;

	const { results } = result as { results?: Array<PagefindMatch> };

	return Array.isArray(results) ? results.filter((match) => isTextMatch(match)).length : undefined;
}

// Pagefind searches every meta field, so the image URL alone matches gibberish and hides zero-result searches
function isTextMatch({ matchedMetaFields = [], words }: PagefindMatch) {
	return words.length > 0 || matchedMetaFields.some((field) => !imageMetaFields.has(field));
}

function getSearchTracker(instance: Instance) {
	const existing = searchTrackers.get(instance);

	if (existing) return existing;

	const tracker = createSearchTracker((event, data) => {
		window.umami?.track(`search-${event}`, data);
	});

	instance.on('results', (result: unknown) => {
		tracker.update(instance.searchTerm, getResultCount(result));
	});

	searchTrackers.set(instance, tracker);

	return tracker;
}

// Pagefind components never deregister (Pagefind/pagefind#1230); a fresh instance per page keeps the registry bounded
document.addEventListener('astro:before-swap', () => {
	if (!instanceManager) return;

	for (const name of instanceManager.getInstanceNames()) {
		instanceManager.removeInstance(name);
	}
});

if (!customElements.get('search-toggle')) {
	customElements.define('search-toggle', SearchToggle);
}

declare global {
	interface HTMLElementTagNameMap {
		'search-toggle': SearchToggle;
	}
}
