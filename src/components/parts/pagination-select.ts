import { navigate } from 'astro:transitions/client';

// Navigation commits on `change` only for a pointer-driven pick on a fine pointer, otherwise via Go or Enter
class PaginationSelect extends HTMLElement {
	#abortController: AbortController | undefined;
	#currentUrl = '';
	#form: HTMLFormElement | undefined;
	#initialized = false;
	#isPointerDriven = false;
	#select: HTMLSelectElement | undefined;
	#submit: HTMLButtonElement | undefined;

	connectedCallback() {
		if (!this.#initialized) {
			this.#enhance();
			this.#initialized = true;
		}

		if (!this.#form || !this.#select) return;

		this.#abortController = new AbortController();
		const { signal } = this.#abortController;

		this.#form.addEventListener('submit', this.#handleSubmit, { signal });
		this.#select.addEventListener('change', this.#handleChange, { signal });
		this.#select.addEventListener('pointerdown', this.#handlePointerDown, { signal });
		this.#select.addEventListener('keydown', this.#handleKeyDown, { signal });
	}

	disconnectedCallback() {
		this.#abortController?.abort();
	}

	#enhance() {
		const form = this.querySelector<HTMLFormElement>('[data-pagination-form]');
		const select = this.querySelector<HTMLSelectElement>('[data-pagination-control]');

		if (!form || !select) return;

		// Restored form state can disagree with `select.value`, so the baseline comes from markup
		this.#currentUrl = select.querySelector<HTMLOptionElement>('option[data-current]')?.value ?? '';

		const counter = this.querySelector<HTMLElement>('[data-pagination-counter]');
		const navigation = this.querySelector('nav');

		if (counter) counter.hidden = true;
		if (navigation) navigation.hidden = false;
		form.hidden = false;

		this.#lockSelectWidth(select);

		this.#form = form;
		this.#select = select;
		this.#submit = form.querySelector<HTMLButtonElement>('[data-pagination-submit]') ?? undefined;
		this.#syncSubmit();
	}

	#handleChange = () => {
		// A coarse-pointer picker is easy to mis-tap, so touch commits through Go
		// Firefox changes a closed select on arrow keys and wheel, so keyboard changes never navigate
		const shouldNavigate = this.#isPointerDriven && !matchMedia('(pointer: coarse)').matches;

		this.#isPointerDriven = false;

		// Syncing here would flash Go while the navigation resolves
		if (shouldNavigate) {
			this.#navigateToSelectedOption();
			return;
		}

		this.#syncSubmit();
	};

	#handleKeyDown = () => {
		this.#isPointerDriven = false;
	};

	#handlePointerDown = () => {
		this.#isPointerDriven = true;
	};

	#handleSubmit = (event: SubmitEvent) => {
		event.preventDefault();
		this.#navigateToSelectedOption();
	};

	// Pin a width floor to the longest label so picking an option never resizes the control
	// The 0.5ch buffer absorbs per-glyph width variance and font slack, so exact measurement isn't needed
	#lockSelectWidth(select: HTMLSelectElement) {
		let widestIndex = 0;
		let widestLength = 0;

		for (const option of select.options) {
			if (option.text.length <= widestLength) continue;

			widestIndex = option.index;
			widestLength = option.text.length;
		}

		const lockWidth = () => {
			const selectedIndex = select.selectedIndex;

			select.style.minInlineSize = '';
			select.selectedIndex = widestIndex;
			const width = Math.ceil(select.getBoundingClientRect().width);
			select.selectedIndex = selectedIndex;

			if (width > 0) select.style.minInlineSize = `calc(${String(width)}px + 0.5ch)`;
		};

		lockWidth();

		// Fallback metrics mis-size the floor, so re-measure once webfonts settle
		if (document.fonts.status !== 'loaded') {
			void (async () => {
				await document.fonts.ready;
				lockWidth();
			})();
		}
	}

	#navigateToSelectedOption() {
		if (!this.#select) return;

		const url = this.#select.value;

		// An engine that lets the placeholder be picked still gets no navigation from it
		if (url === '' || url === this.#currentUrl) return;

		// Using the navigate function (not location.assign) for compatibility with Astro's view transitions
		void navigate(url);
	}

	#syncSubmit() {
		if (!this.#submit || !this.#select) return;

		this.#submit.toggleAttribute('data-visible', this.#select.value !== this.#currentUrl);
	}
}

if (!customElements.get('pagination-select')) {
	customElements.define('pagination-select', PaginationSelect);
}

// eslint-disable-next-line unicorn/require-module-specifiers -- required without another export, which we don't need
export {};

declare global {
	interface HTMLElementTagNameMap {
		'pagination-select': PaginationSelect;
	}
}
