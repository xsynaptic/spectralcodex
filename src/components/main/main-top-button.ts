const hideThresholdPixels = 16;
const revealThresholdPixels = 64;

// Eligibility gate: stay hidden until the reader is genuinely deep into a long page
const minViewportMultiple = 2;
const minPageFraction = 0.2;

// Matches Tailwind's `sm` breakpoint; the host is `sm:hidden`, so the button only operates below it
const desktopMediaQuery = '(min-width: 640px)';

class TopButton extends HTMLElement {
	#desktopQuery: MediaQueryList | undefined;
	#lastScrollY = 0;
	#scrollAccumulator = 0;
	#animationFrameId: number | undefined;

	connectedCallback() {
		this.#setHidden(true);
		this.addEventListener('click', this.#handleClick);

		this.#desktopQuery = window.matchMedia(desktopMediaQuery);
		this.#desktopQuery.addEventListener('change', this.#handleViewportChange);
		this.#handleViewportChange();
	}

	disconnectedCallback() {
		this.removeEventListener('click', this.#handleClick);
		this.#desktopQuery?.removeEventListener('change', this.#handleViewportChange);
		this.#detachScroll();
	}

	// Only do scroll work on viewports where the button can actually be shown
	#handleViewportChange = () => {
		if (this.#desktopQuery?.matches) {
			this.#detachScroll();
			this.#setHidden(true);
		} else {
			this.#attachScroll();
		}
	};

	#attachScroll() {
		this.#lastScrollY = window.scrollY;
		this.#scrollAccumulator = 0;
		window.addEventListener('scroll', this.#handleScroll, { passive: true });
	}

	#detachScroll() {
		window.removeEventListener('scroll', this.#handleScroll);
		if (this.#animationFrameId !== undefined) {
			cancelAnimationFrame(this.#animationFrameId);
			this.#animationFrameId = undefined;
		}
	}

	#handleScroll = () => {
		if (this.#animationFrameId !== undefined) return;
		this.#animationFrameId = requestAnimationFrame(this.#update);
	};

	#update = () => {
		this.#animationFrameId = undefined;

		const scrollY = window.scrollY;
		const delta = scrollY - this.#lastScrollY;
		this.#lastScrollY = scrollY;

		const viewportHeight = window.innerHeight;
		const pageHeight = document.documentElement.scrollHeight;
		const minScroll = Math.max(viewportHeight * minViewportMultiple, pageHeight * minPageFraction);

		// Below the gate, scrolling back is cheap; keep the button out of the way
		if (scrollY < minScroll) {
			this.#setHidden(true);
			this.#scrollAccumulator = 0;
			return;
		}

		// Past the gate, reveal on sustained upward scroll, hide on sustained downward
		this.#scrollAccumulator -= delta;
		if (this.#scrollAccumulator < -hideThresholdPixels) {
			this.#setHidden(true);
			this.#scrollAccumulator = 0;
		} else if (this.#scrollAccumulator > revealThresholdPixels) {
			this.#setHidden(false);
			this.#scrollAccumulator = 0;
		}
	};

	#setHidden(isHidden: boolean) {
		if (this.inert === isHidden) return;
		this.inert = isHidden;
	}

	#handleClick = () => {
		const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });

		// Land keyboard and screen reader users at the top, matching the skip link target
		const target = document.querySelector('#main-content');

		if (target instanceof HTMLElement) {
			target.setAttribute('tabindex', '-1');
			target.focus({ preventScroll: true });
		}
	};
}

if (!customElements.get('top-button')) {
	customElements.define('top-button', TopButton);
}

export {};

declare global {
	interface HTMLElementTagNameMap {
		'top-button': TopButton;
	}
}
