import { openAtlas } from '#lib/atlas/atlas-mode.ts';

class AtlasOpen extends HTMLElement {
	connectedCallback() {
		this.addEventListener('click', this.#handleClick);
	}

	disconnectedCallback() {
		this.removeEventListener('click', this.#handleClick);
	}

	#handleClick = (event: MouseEvent) => {
		event.preventDefault();
		openAtlas();
	};
}

if (!customElements.get('atlas-open')) {
	customElements.define('atlas-open', AtlasOpen);
}
