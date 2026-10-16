import { mapTrackEventName } from '@spectralcodex/react-map-component/constants';

document.addEventListener(mapTrackEventName, ({ detail: { data, name } }) => {
	window.umami?.track(name, data);
});
