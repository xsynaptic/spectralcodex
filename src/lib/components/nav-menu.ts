class NavMenu extends HTMLElement {
	#lastPointerType = '';

	#handlePointerDown = (event: PointerEvent) => {
		this.#lastPointerType = event.pointerType;
	};

	#handleClick = (event: Event) => {
		const target = event.target as Element;
		const li = target.closest<HTMLElement>('li[data-has-submenu]');

		if (!li) {
			this.#closeAll();
			return;
		}

		const isTouch = this.#lastPointerType === 'touch';

		// Touch taps on links with submenus: first tap opens, second tap navigates
		if (target.closest('a') && isTouch) {
			const trigger = li.querySelector<HTMLElement>(':scope > div');

			if (trigger?.contains(target as Node) && li.dataset.open === undefined) {
				event.preventDefault();
				this.#closeSiblings(li);
				this.#open(li);
				return;
			}

			// Already open; let the tap navigate
			return;
		}

		// Non-touch: let clicks on links navigate normally
		if (target.closest('a')) return;

		// Only respond to clicks within the trigger element
		const trigger = li.querySelector<HTMLElement>(':scope > div');

		if (!trigger?.contains(target as Node)) return;

		event.preventDefault();

		this.#closeSiblings(li);

		if (li.dataset.open === undefined) {
			this.#open(li);
		} else {
			this.#close(li);
		}
	};

	#handleClickOutside = (event: Event) => {
		if (!this.contains(event.target as Node)) {
			this.#closeAll();
		}
	};

	#handleKeydown = (event: KeyboardEvent) => {
		const target = event.target as Element;

		if (!this.contains(target)) return;

		const menuitem = target.closest<HTMLAnchorElement>('a[role="menuitem"]');

		if (!menuitem) {
			if (event.key === 'Escape') this.#closeAll();
			return;
		}

		const li = menuitem.closest<HTMLElement>('li');

		if (!li) return;

		const parentUl = li.closest<HTMLElement>('ul');
		const isMenubar = parentUl?.getAttribute('role') === 'menubar';

		switch (event.key) {
			case 'ArrowRight': {
				if (isMenubar) {
					event.preventDefault();
					this.#focusSibling(li, 'next');
				} else if (li.dataset.hasSubmenu !== undefined) {
					event.preventDefault();
					this.#open(li);
					this.#focusFirstItem(li);
				}
				break;
			}
			case 'ArrowLeft': {
				if (isMenubar) {
					event.preventDefault();
					this.#focusSibling(li, 'prev');
				} else {
					event.preventDefault();
					this.#closeAndFocusTrigger(li);
				}
				break;
			}
			case 'ArrowDown': {
				event.preventDefault();

				if (isMenubar) {
					if (li.dataset.hasSubmenu !== undefined) {
						this.#open(li);
						this.#focusFirstItem(li);
					}
				} else {
					this.#focusSibling(li, 'next');
				}
				break;
			}
			case 'ArrowUp': {
				event.preventDefault();

				if (!isMenubar) {
					const siblings = this.#getSiblingItems(li);
					const isFirst = siblings[0] === li;

					if (isFirst) {
						this.#closeAndFocusTrigger(li);
					} else {
						this.#focusSibling(li, 'prev');
					}
				}
				break;
			}
			case 'Escape': {
				event.preventDefault();
				this.#closeAndFocusTrigger(li);
				break;
			}
			case 'Enter':
			case ' ': {
				if (li.dataset.hasSubmenu !== undefined) {
					event.preventDefault();

					if (li.dataset.open === undefined) {
						this.#open(li);
						this.#focusFirstItem(li);
					} else {
						this.#close(li);
					}
				}
				// Enter without children: default link navigation
				break;
			}
			case 'Home': {
				event.preventDefault();
				this.#focusEdgeItem(li, 'first');
				break;
			}
			case 'End': {
				event.preventDefault();
				this.#focusEdgeItem(li, 'last');
				break;
			}
		}
	};

	#resetItem(li: HTMLElement) {
		delete li.dataset.open;

		const link = li.querySelector<HTMLElement>('a[role="menuitem"]');

		if (link) link.setAttribute('aria-expanded', 'false');

		const chevron = li.querySelector<HTMLElement>(':scope > div > svg');

		if (chevron) chevron.style.transform = '';

		const submenu = li.querySelector<HTMLElement>(':scope > ul');

		if (submenu) {
			submenu.style.pointerEvents = '';
			submenu.style.visibility = '';
			submenu.style.opacity = '';
		}
	}

	#open(li: HTMLElement) {
		li.dataset.open = '';

		const link = li.querySelector<HTMLElement>('a[role="menuitem"]');

		if (link) link.setAttribute('aria-expanded', 'true');

		const chevron = li.querySelector<HTMLElement>(':scope > div > svg');

		if (chevron) chevron.style.transform = 'scaleY(-1)';

		const submenu = li.querySelector<HTMLElement>(':scope > ul');

		if (submenu) {
			submenu.style.pointerEvents = 'auto';
			submenu.style.visibility = 'visible';
			submenu.style.opacity = '1';
		}
	}

	#closeSiblings(li: HTMLElement) {
		const parent = li.parentElement;

		if (!parent) return;

		for (const sibling of parent.children) {
			if (sibling !== li && sibling instanceof HTMLElement) {
				this.#close(sibling);
			}
		}
	}

	#close(li: HTMLElement) {
		this.#resetItem(li);

		for (const child of li.querySelectorAll<HTMLElement>('[data-open]')) {
			this.#resetItem(child);
		}
	}

	#closeAll() {
		for (const el of this.querySelectorAll<HTMLElement>('[data-open]')) {
			this.#resetItem(el);
		}
	}

	#closeAndFocusTrigger(li: HTMLElement) {
		const parentUl = li.closest<HTMLElement>('ul[role="menu"]');

		if (!parentUl) {
			this.#closeAll();
			return;
		}

		const triggerLi = parentUl.closest<HTMLElement>('li');

		if (triggerLi) {
			this.#close(triggerLi);

			const triggerLink = triggerLi.querySelector<HTMLAnchorElement>(
				':scope > div a[role="menuitem"]',
			);

			if (triggerLink) {
				this.#setRovingTabindex(triggerLink);
				triggerLink.focus();
			}
		}
	}

	#focusSibling(li: HTMLElement, direction: 'next' | 'prev') {
		const items = this.#getSiblingItems(li);
		const currentIndex = items.indexOf(li);

		if (currentIndex === -1) return;

		const nextIndex =
			direction === 'next'
				? (currentIndex + 1) % items.length
				: (currentIndex - 1 + items.length) % items.length;

		const nextLink = items[nextIndex]?.querySelector<HTMLAnchorElement>(
			':scope > div a[role="menuitem"]',
		);

		if (nextLink) {
			this.#setRovingTabindex(nextLink);
			nextLink.focus();
		}
	}

	#focusFirstItem(li: HTMLElement) {
		const submenu = li.querySelector<HTMLElement>(':scope > ul');
		const firstLink = submenu?.querySelector<HTMLAnchorElement>(
			':scope > li > div a[role="menuitem"]',
		);

		if (firstLink) {
			this.#setRovingTabindex(firstLink);
			firstLink.focus();
		}
	}

	#focusEdgeItem(li: HTMLElement, edge: 'first' | 'last') {
		const items = this.#getSiblingItems(li);

		if (items.length === 0) return;

		const target = edge === 'first' ? items[0] : items.at(-1);
		const link = target?.querySelector<HTMLAnchorElement>(':scope > div a[role="menuitem"]');

		if (link) {
			this.#setRovingTabindex(link);
			link.focus();
		}
	}

	#getSiblingItems(li: HTMLElement) {
		const parentUl = li.closest<HTMLElement>('ul');

		if (!parentUl) return [];

		return [...parentUl.querySelectorAll<HTMLElement>(':scope > li')];
	}

	#setRovingTabindex(activeLink: HTMLElement) {
		const parentUl = activeLink.closest<HTMLElement>('ul');

		if (!parentUl) return;

		for (const link of parentUl.querySelectorAll<HTMLElement>(
			':scope > li > div a[role="menuitem"]',
		)) {
			link.setAttribute('tabindex', link === activeLink ? '0' : '-1');
		}
	}

	#injectAria() {
		let submenuId = 0;

		// Root <ul> becomes menubar
		const menubar = this.querySelector<HTMLElement>(':scope > nav > ul');

		if (!menubar) return;

		menubar.setAttribute('role', 'menubar');

		for (const li of this.querySelectorAll<HTMLElement>('li')) {
			li.setAttribute('role', 'none');

			const link = li.querySelector<HTMLElement>(':scope > div a');

			if (link) link.setAttribute('role', 'menuitem');

			const submenu = li.querySelector<HTMLElement>(':scope > ul');

			if (submenu) {
				li.dataset.hasSubmenu = '';

				const id = `nav-submenu-${String(submenuId++)}`;

				submenu.id = id;
				submenu.setAttribute('role', 'menu');

				if (link) {
					link.setAttribute('aria-haspopup', 'true');
					link.setAttribute('aria-expanded', 'false');
					link.setAttribute('aria-controls', id);
				}
			}
		}

		// Roving tabindex on menubar items
		const menubarLinks = menubar.querySelectorAll<HTMLElement>(
			':scope > li > div a[role="menuitem"]',
		);

		for (const [index, link] of menubarLinks.entries()) {
			link.setAttribute('tabindex', index === 0 ? '0' : '-1');
		}
	}

	connectedCallback() {
		this.#injectAria();
		this.dataset.enhanced = '';
		this.addEventListener('pointerdown', this.#handlePointerDown);
		this.addEventListener('click', this.#handleClick);
		this.addEventListener('keydown', this.#handleKeydown);
		document.addEventListener('click', this.#handleClickOutside);
	}

	disconnectedCallback() {
		this.removeEventListener('pointerdown', this.#handlePointerDown);
		this.removeEventListener('click', this.#handleClick);
		this.removeEventListener('keydown', this.#handleKeydown);
		document.removeEventListener('click', this.#handleClickOutside);
	}
}

customElements.define('nav-menu', NavMenu);

// eslint-disable-next-line unicorn/require-module-specifiers -- required without another export, which we don't need
export {};

declare global {
	interface HTMLElementTagNameMap {
		'nav-menu': NavMenu;
	}
}
