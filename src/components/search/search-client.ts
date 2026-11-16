import { reportSearch } from '@spectralcodex/shared/search-tracker';
import {
	defineSearchToggle,
	searchToggleSearchEventName,
} from '@xsynaptic/astro-pagefind/search-toggle';

document.addEventListener(searchToggleSearchEventName, ({ detail }) => {
	reportSearch(detail, (event, data) => {
		window.umami?.track(`search-${event}`, data);
	});
});

defineSearchToggle();
