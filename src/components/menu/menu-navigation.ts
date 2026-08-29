/**
 * An accessible nested menu web component; DOM contract:
 *
 * <menu-navigation>
 *   <nav>
 *     <ul>                  <-- becomes role="menubar"
 *       <li>                <-- a menu item
 *         <a|button|span>   <-- first element in the <li> that is NOT inside the submenu
 *         <ul>...</ul>      <-- optional submenu; must be a direct child of the <li>
 *       </li>
 *     </ul>
 *   </nav>
 * </menu-navigation>
 *
 * Note: use <a> for navigable triggers, <button> for text-only labels with children, <span> for text-only
 *
 * State exposed for CSS:
 *   data-has-submenu  on every <li> that has a submenu
 *   data-open         on every currently-open <li>
 */
let instanceCount = 0;

class NavMenu extends HTMLElement {
	#controller: AbortController | undefined;
	#lastPointerType = '';
	#instanceId = `nav-${String(instanceCount++)}`;
	#initialized = false;

	#getSubmenu(li: HTMLElement): HTMLElement | undefined {
		return li.querySelector<HTMLElement>(':scope > ul') ?? undefined;
	}

	#getTrigger(li: HTMLElement): HTMLElement | undefined {
		const submenu = this.#getSubmenu(li);

		for (const trigger of li.querySelectorAll<HTMLElement>('a, button')) {
			if (!submenu?.contains(trigger)) return trigger;
		}

		return undefined;
	}

	#getMenuitems(ul: HTMLElement): Array<HTMLElement> {
		const menuitems: Array<HTMLElement> = [];

		for (const li of ul.querySelectorAll<HTMLElement>(':scope > li')) {
			const trigger = this.#getTrigger(li);
			if (trigger) menuitems.push(trigger);
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

	// Touch taps on an anchor menuitem: first tap opens, second tap navigates
	#handleTouchAnchorClick(event: Event, li: HTMLElement, inTrigger: boolean) {
		if (!inTrigger || li.dataset.open !== undefined) return;

		event.preventDefault();
		this.#closeSiblings(li);
		this.#open(li);
	}

	#handleClick = (event: Event) => {
		const target = event.target as Element;
		const li = target.closest<HTMLElement>('li[data-has-submenu]');

		if (!li) {
			this.#closeAll();
			return;
		}

		const trigger = this.#getTrigger(li);
		const inTrigger = this.#triggerContains(li, target);

		if (trigger instanceof HTMLAnchorElement && trigger.contains(target)) {
			if (this.#lastPointerType === 'touch') this.#handleTouchAnchorClick(event, li, inTrigger);
			return;
		}

		// Button triggers, chevron clicks, or anything else in the trigger zone: toggle
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

		const menuitem = target.closest<HTMLElement>('[role="menuitem"]');

		if (!menuitem) {
			if (event.key === 'Escape') this.#closeAll();
			return;
		}

		const li = menuitem.closest<HTMLElement>('li');

		if (li) this.#handleMenuitemKeydown(event, li);
	};

	#handleMenuitemKeydown(event: KeyboardEvent, li: HTMLElement) {
		const isMenubar = li.closest<HTMLElement>('ul')?.getAttribute('role') === 'menubar';

		switch (event.key) {
			case 'ArrowRight': {
				this.#handleArrowRight(event, li, isMenubar);
				break;
			}
			case 'ArrowLeft': {
				this.#handleArrowLeft(event, li, isMenubar);
				break;
			}
			case 'ArrowDown': {
				this.#handleArrowDown(event, li, isMenubar);
				break;
			}
			case 'ArrowUp': {
				this.#handleArrowUp(event, li, isMenubar);
				break;
			}
			case 'Escape': {
				event.preventDefault();
				this.#closeAndFocusTrigger(li);
				break;
			}
			case 'Enter':
			case ' ': {
				this.#handleActivate(event, li);
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
	}

	#handleArrowRight(event: KeyboardEvent, li: HTMLElement, isMenubar: boolean) {
		if (isMenubar) {
			event.preventDefault();
			this.#focusSibling(li, 'next');
			return;
		}

		if (li.dataset.hasSubmenu === undefined) return;

		event.preventDefault();
		this.#open(li);
		this.#focusFirstItem(li);
	}

	#handleArrowLeft(event: KeyboardEvent, li: HTMLElement, isMenubar: boolean) {
		event.preventDefault();

		if (isMenubar) {
			this.#focusSibling(li, 'prev');
			return;
		}

		this.#closeAndFocusTrigger(li);
	}

	#handleArrowDown(event: KeyboardEvent, li: HTMLElement, isMenubar: boolean) {
		event.preventDefault();

		if (!isMenubar) {
			this.#focusSibling(li, 'next');
			return;
		}

		if (li.dataset.hasSubmenu === undefined) return;

		this.#open(li);
		this.#focusFirstItem(li);
	}

	#handleArrowUp(event: KeyboardEvent, li: HTMLElement, isMenubar: boolean) {
		event.preventDefault();

		if (isMenubar) return;

		if (this.#getSiblingItems(li)[0] === li) {
			this.#closeAndFocusTrigger(li);
			return;
		}

		this.#focusSibling(li, 'prev');
	}

	#handleActivate(event: KeyboardEvent, li: HTMLElement) {
		if (li.dataset.hasSubmenu === undefined) return;

		event.preventDefault();

		if (li.dataset.open !== undefined) {
			this.#close(li);
			return;
		}

		this.#open(li);
		this.#focusFirstItem(li);
	}

	#resetItem(li: HTMLElement) {
		delete li.dataset.open;

		const trigger = this.#getTrigger(li);

		if (trigger) trigger.setAttribute('aria-expanded', 'false');
	}

	#open(li: HTMLElement) {
		li.dataset.open = '';

		const trigger = this.#getTrigger(li);

		if (trigger) trigger.setAttribute('aria-expanded', 'true');
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

			const triggerElement = this.#getTrigger(triggerLi);

			if (triggerElement) {
				this.#setRovingTabindex(triggerElement);
				triggerElement.focus();
			}
		}
	}

	#focusSibling(li: HTMLElement, direction: 'next' | 'prev') {
		const items = this.#getSiblingItems(li);
		const currentIndex = items.indexOf(li);

		if (currentIndex === -1) return;

		const nextIndex =
			(direction === 'next' ? currentIndex + 1 : currentIndex - 1 + items.length) % items.length;

		const nextItem = items[nextIndex];
		const nextTrigger = nextItem ? this.#getTrigger(nextItem) : undefined;

		if (nextTrigger) {
			this.#setRovingTabindex(nextTrigger);
			nextTrigger.focus();
		}
	}

	#focusFirstItem(li: HTMLElement) {
		const submenu = this.#getSubmenu(li);

		if (!submenu) return;

		const firstTrigger = this.#getMenuitems(submenu)[0];

		if (firstTrigger) {
			this.#setRovingTabindex(firstTrigger);
			firstTrigger.focus();
		}
	}

	#focusEdgeItem(li: HTMLElement, edge: 'first' | 'last') {
		const parentUl = li.closest<HTMLElement>('ul');

		if (!parentUl) return;

		const menuitems = this.#getMenuitems(parentUl);
		const trigger = edge === 'first' ? menuitems[0] : menuitems.at(-1);

		if (trigger) {
			this.#setRovingTabindex(trigger);
			trigger.focus();
		}
	}

	#getSiblingItems(li: HTMLElement) {
		const parentUl = li.closest<HTMLElement>('ul');

		if (!parentUl) return [];

		return [...parentUl.querySelectorAll<HTMLElement>(':scope > li')];
	}

	#setRovingTabindex(activeTrigger: HTMLElement) {
		const parentUl = activeTrigger.closest<HTMLElement>('ul');

		if (!parentUl) return;

		for (const trigger of this.#getMenuitems(parentUl)) {
			trigger.setAttribute('tabindex', trigger === activeTrigger ? '0' : '-1');
		}
	}

	#injectAria() {
		// Root <ul> becomes menubar
		const menubar = this.querySelector<HTMLElement>(':scope > nav > ul');

		if (!menubar) return;

		menubar.setAttribute('role', 'menubar');

		let submenuId = 0;

		for (const li of this.querySelectorAll<HTMLElement>('li')) {
			li.setAttribute('role', 'none');

			const trigger = this.#getTrigger(li);

			if (trigger) trigger.setAttribute('role', 'menuitem');

			const submenu = this.#getSubmenu(li);

			if (submenu) {
				li.dataset.hasSubmenu = '';

				const id = `${this.#instanceId}-sub-menu-${String(submenuId++)}`;

				submenu.id = id;
				submenu.setAttribute('role', 'menu');

				if (trigger) {
					trigger.setAttribute('aria-haspopup', 'true');
					trigger.setAttribute('aria-expanded', 'false');
					trigger.setAttribute('aria-controls', id);
				}
			}
		}

		// Roving tabindex on menubar items
		for (const [index, trigger] of this.#getMenuitems(menubar).entries()) {
			trigger.setAttribute('tabindex', index === 0 ? '0' : '-1');
		}
	}

	connectedCallback() {
		// ARIA injection mutates the light DOM once; a move/reconnect must not re-run it
		if (!this.#initialized) {
			this.#injectAria();
			this.#initialized = true;
		}

		this.#controller = new AbortController();

		const { signal } = this.#controller;

		this.addEventListener('pointerdown', this.#handlePointerDown, { signal });
		this.addEventListener('click', this.#handleClick, { signal });
		this.addEventListener('keydown', this.#handleKeydown, { signal });
		document.addEventListener('click', this.#handleClickOutside, { signal });
	}

	disconnectedCallback() {
		this.#controller?.abort();
		this.#controller = undefined;
	}
}

if (!customElements.get('menu-navigation')) {
	customElements.define('menu-navigation', NavMenu);
}

export {};

declare global {
	interface HTMLElementTagNameMap {
		'menu-navigation': NavMenu;
	}
}
