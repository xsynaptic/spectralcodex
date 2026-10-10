import { openAtlas } from '#lib/atlas/atlas-mode.ts';

class AtlasOpen extends HTMLElement {
	connectedCallback() {
		this.addEventListener('click', this.#handleClick);
	}

	disconnectedCallback() {
		this.removeEventListener('click', this.#handleClick);
	}

	#handleClick = (event: MouseEvent) => {
		if (openAtlas()) event.preventDefault();
	};
}

if (!customElements.get('atlas-open')) {
	customElements.define('atlas-open', AtlasOpen);
}
