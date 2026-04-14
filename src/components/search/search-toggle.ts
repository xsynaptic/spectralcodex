import type { Instance, PagefindModal } from '@pagefind/component-ui';

import { getInstanceManager } from '@pagefind/component-ui';

const isMac = typeof navigator !== 'undefined' && /mac/i.test(navigator.userAgent);

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
}
