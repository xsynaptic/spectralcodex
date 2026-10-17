import { mapTrackEventName } from '@spectralcodex/react-map-component/constants';

let isTraversing = false;

document.addEventListener(mapTrackEventName, ({ detail: { data, mapId, name } }) => {
	window.umami?.track(name, { ...data, mapId });
});

// The tracker learns the URL only from pushState and replaceState, which back and forward never call
document.addEventListener('astro:before-swap', (event) => {
	isTraversing = event.navigationType === 'traverse';
});

document.addEventListener('astro:after-swap', () => {
	if (!isTraversing) return;

	history.replaceState(history.state, '', location.href);
});
