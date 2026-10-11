import type { MapTrackDetail } from '@spectralcodex/react-map-component';

import { mapTrackEventName } from '@spectralcodex/react-map-component/constants';

document.addEventListener(mapTrackEventName, (event) => {
	if (!(event instanceof CustomEvent)) return;

	const { data, name } = event.detail as MapTrackDetail;

	window.umami?.track(name, data);
});
