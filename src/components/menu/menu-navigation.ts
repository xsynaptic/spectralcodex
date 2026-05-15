/**
 * An accessible nested menu web component; DOM contract:
 *
 * <menu-navigation>
 *   <nav>
 *     <ul>                <-- becomes role="menubar"
 *       <li>              <-- a menu item
 *         <a>...</a>      <-- first <a> in the <li> that is NOT inside the submenu
 *         <ul>...</ul>    <-- optional submenu; must be a direct child of the <li>
 *       </li>
 *     </ul>
 *   </nav>
 * </menu-navigation>
 *
 * State exposed for CSS:
 *   data-has-submenu  on every <li> that has a submenu
 *   data-open         on every currently-open <li>
 */
class NavMenu extends HTMLElement {
	#lastPointerType = '';

	#getSubmenu(li: HTMLElement): HTMLElement | undefined {
		return li.querySelector<HTMLElement>(':scope > ul') ?? undefined;
	}

	#getLink(li: HTMLElement): HTMLAnchorElement | undefined {
		const submenu = this.#getSubmenu(li);

		for (const link of li.querySelectorAll<HTMLAnchorElement>('a')) {
			if (!submenu?.contains(link)) return link;
		}

		return undefined;
	}

	#getMenuitems(ul: HTMLElement): Array<HTMLAnchorElement> {
		const menuitems: Array<HTMLAnchorElement> = [];

		for (const li of ul.querySelectorAll<HTMLElement>(':scope > li')) {
			const link = this.#getLink(li);
			if (link) menuitems.push(link);
		}

		return menuitems;
	}

	#triggerContains(li: HTMLElement, target: Node): boolean {
		const submenu = this.#getSubmenu(li);
		return !submenu?.contains(target);
	}

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

		const link = this.#getLink(li);
		const onLink = link ? link.contains(target) : false;
		const inTrigger = this.#triggerContains(li, target);
		const isTouch = this.#lastPointerType === 'touch';

		// Touch taps on the menuitem link: first tap opens, second tap navigates
		if (onLink && isTouch) {
			if (inTrigger && li.dataset.open === undefined) {
				event.preventDefault();
				this.#closeSiblings(li);
				this.#open(li);
			}
			return;
		}

		// Non-touch: let clicks on the menuitem link navigate normally
		if (onLink) return;

		// Otherwise only respond to clicks in the trigger zone
		if (!inTrigger) return;

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

		const link = this.#getLink(li);

		if (link) link.setAttribute('aria-expanded', 'false');
	}

	#open(li: HTMLElement) {
		li.dataset.open = '';

		const link = this.#getLink(li);

		if (link) link.setAttribute('aria-expanded', 'true');
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

			const triggerLink = this.#getLink(triggerLi);

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

		const nextItem = items[nextIndex];
		const nextLink = nextItem ? this.#getLink(nextItem) : undefined;

		if (nextLink) {
			this.#setRovingTabindex(nextLink);
			nextLink.focus();
		}
	}

	#focusFirstItem(li: HTMLElement) {
		const submenu = this.#getSubmenu(li);

		if (!submenu) return;

		const firstLink = this.#getMenuitems(submenu)[0];

		if (firstLink) {
			this.#setRovingTabindex(firstLink);
			firstLink.focus();
		}
	}

	#focusEdgeItem(li: HTMLElement, edge: 'first' | 'last') {
		const parentUl = li.closest<HTMLElement>('ul');

		if (!parentUl) return;

		const menuitems = this.#getMenuitems(parentUl);
		const link = edge === 'first' ? menuitems[0] : menuitems.at(-1);

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

		for (const link of this.#getMenuitems(parentUl)) {
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

			const link = this.#getLink(li);

			if (link) link.setAttribute('role', 'menuitem');

			const submenu = this.#getSubmenu(li);

			if (submenu) {
				li.dataset.hasSubmenu = '';

				const id = `nav-sub-menu-${String(submenuId++)}`;

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
		for (const [index, link] of this.#getMenuitems(menubar).entries()) {
			link.setAttribute('tabindex', index === 0 ? '0' : '-1');
		}
	}

	connectedCallback() {
		this.#injectAria();
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

customElements.define('menu-navigation', NavMenu);

// eslint-disable-next-line unicorn/require-module-specifiers -- required without another export, which we don't need
export {};

declare global {
	interface HTMLElementTagNameMap {
		'menu-navigation': NavMenu;
	}
}
