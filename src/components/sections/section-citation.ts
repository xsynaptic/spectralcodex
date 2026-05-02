const COPIED_FEEDBACK_DURATION = 1500;

class CitationButton extends HTMLElement {
	#timeouts = new Map<HTMLButtonElement, number>();

	connectedCallback() {
		const buttons = this.querySelectorAll<HTMLButtonElement>('button[data-action]');

		for (const button of buttons) {
			button.addEventListener('click', this.#handleClick);
		}
	}

	disconnectedCallback() {
		const buttons = this.querySelectorAll<HTMLButtonElement>('button[data-action]');

		for (const button of buttons) {
			button.removeEventListener('click', this.#handleClick);
		}
		for (const timeoutId of this.#timeouts.values()) {
			globalThis.window.clearTimeout(timeoutId);
		}
		this.#timeouts.clear();
	}

	#handleClick = async (event: Event) => {
		const button = event.currentTarget as HTMLButtonElement;
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

		if (existing !== undefined) globalThis.window.clearTimeout(existing);

		button.textContent = copiedLabel;

		const timeoutId = globalThis.window.setTimeout(() => {
			button.textContent = original;
			this.#timeouts.delete(button);
		}, COPIED_FEEDBACK_DURATION);

		this.#timeouts.set(button, timeoutId);
	}
}

customElements.define('citation-button', CitationButton);

// eslint-disable-next-line unicorn/require-module-specifiers -- required without another export, which we don't need
export {};

declare global {
	interface HTMLElementTagNameMap {
		'citation-button': CitationButton;
	}
}
