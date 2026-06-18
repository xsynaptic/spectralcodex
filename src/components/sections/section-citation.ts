const COPIED_FEEDBACK_DURATION = 1500;

class CitationButton extends HTMLElement {
	#timeouts = new Map<HTMLButtonElement, number>();

	connectedCallback() {
		this.addEventListener('click', this.#handleClickEvent);
	}

	disconnectedCallback() {
		this.removeEventListener('click', this.#handleClickEvent);

		for (const timeoutId of this.#timeouts.values()) {
			window.clearTimeout(timeoutId);
		}
		this.#timeouts.clear();
	}

	// Void-returning wrapper for use as a click listener
	#handleClickEvent = (event: Event) => {
		void this.#handleClick(event);
	};

	#handleClick = async (event: Event) => {
		const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button[data-action]');

		if (!button) return;

		const action = button.dataset.action;

		const payload = action === 'copy-json' ? this.#getJsonPayload() : this.#getTextPayload();

		if (!payload) return;

		try {
			await navigator.clipboard.writeText(payload);

			this.#showCopiedFeedback(button);
		} catch {
			// Clipboard write blocked; silently no-op
		}
	};

	#getTextPayload(): string | undefined {
		return this.querySelector('.citation-line')?.textContent.trim();
	}

	#getJsonPayload(): string | undefined {
		const raw = this.dataset.json;
		if (!raw) return;
		try {
			const parsed = JSON.parse(raw) as Array<Record<string, unknown>>;
			const item = parsed[0];

			if (!item) return raw;

			const now = new Date();

			item.accessed = {
				'date-parts': [[now.getUTCFullYear(), now.getUTCMonth() + 1, now.getUTCDate()]],
			};
			return JSON.stringify(parsed);
		} catch {
			return raw;
		}
	}

	#showCopiedFeedback(button: HTMLButtonElement) {
		const original = button.textContent;
		const copiedLabel = this.dataset.copiedLabel ?? 'Copied';

		const existing = this.#timeouts.get(button);

		if (existing !== undefined) window.clearTimeout(existing);

		button.textContent = copiedLabel;

		const timeoutId = window.setTimeout(() => {
			button.textContent = original;
			this.#timeouts.delete(button);
		}, COPIED_FEEDBACK_DURATION);

		this.#timeouts.set(button, timeoutId);
	}
}

if (!customElements.get('citation-button')) {
	customElements.define('citation-button', CitationButton);
}

export {};

declare global {
	interface HTMLElementTagNameMap {
		'citation-button': CitationButton;
	}
}
