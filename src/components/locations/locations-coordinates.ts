const copiedDurationMs = 2000;

class CopyCoordinates extends HTMLElement {
	#controller: AbortController | undefined;
	#resetTimeout: ReturnType<typeof setTimeout> | undefined;

	connectedCallback() {
		const button = this.querySelector<HTMLButtonElement>('[data-copy-button]');

		if (!button || !('clipboard' in navigator)) return;

		this.#controller = new AbortController();
		button.addEventListener('click', this.#handleClick, { signal: this.#controller.signal });
		button.disabled = false;
	}

	disconnectedCallback() {
		this.#controller?.abort();
		this.#controller = undefined;
		clearTimeout(this.#resetTimeout);
		this.#setCopied(false);
	}

	async #copy() {
		const value = this.querySelector('[data-copy-value]')?.textContent.trim();

		if (!value) return;

		try {
			await navigator.clipboard.writeText(value);
		} catch {
			return;
		}

		if (!this.isConnected) return;

		this.#setCopied(true);

		clearTimeout(this.#resetTimeout);
		this.#resetTimeout = setTimeout(() => {
			this.#setCopied(false);
		}, copiedDurationMs);
	}

	#handleClick = () => {
		void this.#copy();
	};

	#setCopied(isCopied: boolean) {
		const icon = this.querySelector<HTMLElement>('[data-copy-icon]');
		const iconDone = this.querySelector<HTMLElement>('[data-copy-icon-done]');
		const status = this.querySelector<HTMLElement>('[data-copy-status]');

		if (icon) icon.hidden = isCopied;
		if (iconDone) iconDone.hidden = !isCopied;

		if (status) status.textContent = isCopied ? (status.dataset.copyMessage ?? '') : '';
	}
}

if (!customElements.get('copy-coordinates')) {
	customElements.define('copy-coordinates', CopyCoordinates);
}

export {};

declare global {
	interface HTMLElementTagNameMap {
		'copy-coordinates': CopyCoordinates;
	}
}
