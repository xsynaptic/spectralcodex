/**
 * An accessible nested navigation web component; DOM contract:
 *
 * <site-navigation>
 *   <nav>
 *     <ul>                  <-- the root list
 *       <li>                <-- a navigation item
 *         <a|button|span>   <-- first element in the <li> that is NOT inside the submenu
 *         <ul>...</ul>      <-- optional submenu; must be a direct child of the <li>
 *       </li>
 *     </ul>
 *   </nav>
 * </site-navigation>
 *
 * Note: use <a> for navigable triggers, <button> for text-only labels with children, <span> for text-only
 *
 * State exposed for CSS:
 *   data-has-submenu  on every <li> that has a submenu
 *   data-open         on every currently-open <li>
 */
let instanceCount = 0;

class SiteNavigation extends HTMLElement {
	#controller: AbortController | undefined;
	#lastPointerType = '';
	#hoverOpened: HTMLElement | undefined;
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

	#getTriggers(ul: HTMLElement): Array<HTMLElement> {
		const triggers: Array<HTMLElement> = [];

		for (const li of ul.querySelectorAll<HTMLElement>(':scope > li')) {
			const trigger = this.#getTrigger(li);
			if (trigger) triggers.push(trigger);
		}

		return triggers;
	}

	#triggerContains(li: HTMLElement, target: Node): boolean {
		const submenu = this.#getSubmenu(li);
		return !submenu?.contains(target);
	}

	#isRootLevel(li: HTMLElement) {
		return li.parentElement === this.querySelector(':scope > nav > ul');
	}

	#handlePointerDown = (event: PointerEvent) => {
		this.#lastPointerType = event.pointerType;
	};

	#handlePointerEnter = (event: PointerEvent) => {
		const li = event.currentTarget;

		if (event.pointerType !== 'mouse' || !(li instanceof HTMLElement)) return;

		// Depth 2+ flies out sideways, which only fits at sm and above
		if (!this.#isRootLevel(li) && !matchMedia('(width >= 40rem)').matches) return;

		this.#closeSiblings(li);
		this.#open(li);
		this.#hoverOpened = li;
	};

	#handlePointerLeave = (event: PointerEvent) => {
		const li = event.currentTarget;

		if (event.pointerType !== 'mouse' || !(li instanceof HTMLElement)) return;

		// A passing cursor must not hide a menu whose trigger or items hold keyboard focus
		if (li.querySelector(':focus-visible')) return;

		this.#close(li);
	};

	#handleFocusOut = (event: FocusEvent) => {
		const target = event.target as Node;
		const next = event.relatedTarget instanceof Node ? event.relatedTarget : undefined;

		for (const li of this.querySelectorAll<HTMLElement>('li[data-open]')) {
			if (!li.contains(target) || (next && li.contains(next)) || li.matches(':hover')) continue;

			this.#close(li);
		}
	};

	#handleDocumentKeydown = (event: KeyboardEvent) => {
		if (event.key !== 'Escape' || this.contains(event.target as Node)) return;

		this.#closeAll();
	};

	// Touch taps on an anchor trigger: first tap opens, second tap navigates
	#handleTouchAnchorClick(event: Event, li: HTMLElement, isInTrigger: boolean) {
		if (!isInTrigger || li.dataset.open !== undefined) return;

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
		const isInTrigger = this.#triggerContains(li, target);

		if (trigger instanceof HTMLAnchorElement && trigger.contains(target)) {
			if (this.#lastPointerType === 'touch') this.#handleTouchAnchorClick(event, li, isInTrigger);
			return;
		}

		// Button triggers, chevron clicks, or anything else in the trigger zone: toggle
		if (!isInTrigger) return;

		event.preventDefault();

		this.#closeSiblings(li);

		// The first click after hover opened it must not shut it under the cursor; later clicks toggle
		if (li.dataset.open === undefined || li === this.#hoverOpened) {
			this.#open(li);
			this.#hoverOpened = undefined;
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

		// A keyboard-synthesised click must not take the touch path left over from an earlier tap
		this.#lastPointerType = '';

		const li = target.closest<HTMLElement>('li');
		const trigger = li ? this.#getTrigger(li) : undefined;

		if (!li || !trigger?.contains(target)) {
			if (event.key === 'Escape') this.#closeAll();
			return;
		}

		this.#handleItemKeydown(event, li);
	};

	#handleItemKeydown(event: KeyboardEvent, li: HTMLElement) {
		const isRootLevel = this.#isRootLevel(li);

		switch (event.key) {
			case 'ArrowRight': {
				this.#handleArrowRight(event, li, isRootLevel);
				break;
			}
			case 'ArrowLeft': {
				this.#handleArrowLeft(event, li, isRootLevel);
				break;
			}
			case 'ArrowDown': {
				this.#handleArrowDown(event, li, isRootLevel);
				break;
			}
			case 'ArrowUp': {
				this.#handleArrowUp(event, li, isRootLevel);
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

	#handleArrowRight(event: KeyboardEvent, li: HTMLElement, isRootLevel: boolean) {
		if (isRootLevel) {
			event.preventDefault();
			this.#focusSibling(li, 'next');
			return;
		}

		if (li.dataset.hasSubmenu === undefined) return;

		event.preventDefault();
		this.#open(li);
		this.#focusFirstItem(li);
	}

	#handleArrowLeft(event: KeyboardEvent, li: HTMLElement, isRootLevel: boolean) {
		event.preventDefault();

		if (isRootLevel) {
			this.#focusSibling(li, 'prev');
			return;
		}

		this.#closeAndFocusTrigger(li);
	}

	#handleArrowDown(event: KeyboardEvent, li: HTMLElement, isRootLevel: boolean) {
		event.preventDefault();

		if (!isRootLevel) {
			this.#focusSibling(li, 'next');
			return;
		}

		if (li.dataset.hasSubmenu === undefined) return;

		this.#open(li);
		this.#focusFirstItem(li);
	}

	#handleArrowUp(event: KeyboardEvent, li: HTMLElement, isRootLevel: boolean) {
		if (isRootLevel) return;

		event.preventDefault();

		if (this.#getSiblingItems(li)[0] === li) {
			this.#closeAndFocusTrigger(li);
			return;
		}

		this.#focusSibling(li, 'prev');
	}

	#handleActivate(event: KeyboardEvent, li: HTMLElement) {
		if (li.dataset.hasSubmenu === undefined) return;

		if (event.key === 'Enter' && this.#getTrigger(li)?.matches('a[href]')) return;

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

		if (li === this.#hoverOpened) this.#hoverOpened = undefined;

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
		// A submenu <ul> is a child of the <li> that opens it, so the root list has no ancestor <li>
		const triggerLi = li.parentElement?.closest<HTMLElement>('li');

		if (!triggerLi) {
			this.#closeAll();
			return;
		}

		this.#close(triggerLi);

		const triggerElement = this.#getTrigger(triggerLi);

		if (triggerElement) triggerElement.focus();
	}

	#focusSibling(li: HTMLElement, direction: 'next' | 'prev') {
		const items = this.#getSiblingItems(li);
		const currentIndex = items.indexOf(li);

		if (currentIndex === -1) return;

		const nextIndex =
			(direction === 'next' ? currentIndex + 1 : currentIndex - 1 + items.length) % items.length;

		const nextItem = items[nextIndex];
		const nextTrigger = nextItem ? this.#getTrigger(nextItem) : undefined;

		if (nextTrigger) nextTrigger.focus();
	}

	#focusFirstItem(li: HTMLElement) {
		const submenu = this.#getSubmenu(li);

		if (!submenu) return;

		const firstTrigger = this.#getTriggers(submenu)[0];

		if (firstTrigger) firstTrigger.focus();
	}

	#focusEdgeItem(li: HTMLElement, edge: 'first' | 'last') {
		const parentUl = li.closest<HTMLElement>('ul');

		if (!parentUl) return;

		const triggers = this.#getTriggers(parentUl);
		const trigger = edge === 'first' ? triggers[0] : triggers.at(-1);

		if (trigger) trigger.focus();
	}

	#getSiblingItems(li: HTMLElement) {
		const parentUl = li.closest<HTMLElement>('ul');

		if (!parentUl) return [];

		return [...parentUl.querySelectorAll<HTMLElement>(':scope > li')];
	}

	#injectAria() {
		let submenuId = 0;

		for (const li of this.querySelectorAll<HTMLElement>('li')) {
			const submenu = this.#getSubmenu(li);

			if (!submenu) continue;

			li.dataset.hasSubmenu = '';

			const id = `${this.#instanceId}-sub-menu-${String(submenuId++)}`;

			submenu.id = id;

			const trigger = this.#getTrigger(li);

			if (trigger) {
				trigger.setAttribute('aria-expanded', 'false');
				trigger.setAttribute('aria-controls', id);
			}
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
		this.addEventListener('focusout', this.#handleFocusOut, { signal });
		document.addEventListener('click', this.#handleClickOutside, { signal });
		document.addEventListener('keydown', this.#handleDocumentKeydown, { signal });

		for (const li of this.querySelectorAll<HTMLElement>('li[data-has-submenu]')) {
			li.addEventListener('pointerenter', this.#handlePointerEnter, { signal });
			li.addEventListener('pointerleave', this.#handlePointerLeave, { signal });
		}
	}

	disconnectedCallback() {
		this.#controller?.abort();
		this.#controller = undefined;
	}
}

if (!customElements.get('site-navigation')) {
	customElements.define('site-navigation', SiteNavigation);
}

export {};

declare global {
	interface HTMLElementTagNameMap {
		'site-navigation': SiteNavigation;
	}
}
