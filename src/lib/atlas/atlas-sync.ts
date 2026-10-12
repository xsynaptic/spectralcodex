import { mapSyncEventName } from '@spectralcodex/react-map-component/constants';

export function dispatchSync() {
	document.dispatchEvent(new Event(mapSyncEventName));
}
