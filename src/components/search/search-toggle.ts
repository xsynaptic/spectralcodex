import type {
	getInstanceManager,
	Instance,
	PagefindModal,
	PagefindModalTrigger,
	PagefindSearchResult,
} from '@pagefind/component-ui';

const isMac = typeof navigator !== 'undefined' && /mac/i.test(navigator.userAgent);

const searchQueryDebounceMs = 1500;
const searchQueryMinLength = 2;
const searchQueryMaxLength = 100;

// Pagefind reads these by name off a registered modal-trigger; a rename fails silently without this
type ModalTriggerContract = Pick<PagefindModalTrigger, 'buttonEl' | 'handleModalClose'>;

const instancesWithAnalytics = new WeakSet<Instance>();

let instanceManager: ReturnType<typeof getInstanceManager> | undefined;

class SearchToggle extends HTMLElement implements ModalTriggerContract {
	// eslint-disable-next-line unicorn/no-null -- matches Pagefind's PagefindComponent interface
	instance: Instance | null = null;

	get buttonEl() {
		return this.querySelector<HTMLButtonElement>('button');
	}

	#controller: AbortController | undefined;
	#cssReady?: Promise<void>;

	connectedCallback() {
		this.#controller = new AbortController();

		const { signal } = this.#controller;

		// Static props in markup; only the OS-dependent keyboard hint has to be set client-side
		this.buttonEl?.setAttribute('aria-keyshortcuts', isMac ? 'Meta+K' : 'Control+K');

		this.addEventListener('pointerenter', this.#preloadPagefind, { once: true, signal });
		this.addEventListener('focusin', this.#preloadPagefind, { once: true, signal });

		this.addEventListener('click', this.#handleClickEvent, { signal });
		document.addEventListener('keydown', this.#handleKeydown, { signal });
	}

	disconnectedCallback() {
		this.instance?.deregisterAllShortcuts(this);
		// eslint-disable-next-line unicorn/no-null -- matches Pagefind's PagefindComponent interface
		this.instance = null;
		this.#controller?.abort();
		this.#controller = undefined;
	}

	// Invoked by <pagefind-modal> on close, never from this file
	handleModalClose() {
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

		registerSearchAnalytics(this.instance);

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

	#preloadPagefind = () => {
		void this.#ensurePagefindCss();
		void this.#ensurePagefindRegistered();
	};
}

function getResultCount(result: unknown): number | undefined {
	if (!result || typeof result !== 'object') return undefined;

	const { results } = result as Partial<PagefindSearchResult>;

	return Array.isArray(results) ? results.length : undefined;
}

function registerSearchAnalytics(instance: Instance) {
	if (instancesWithAnalytics.has(instance)) return;

	instancesWithAnalytics.add(instance);

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
