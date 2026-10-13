import {
	mapEnterEventName,
	mapExitEventName,
	mapExpandEventName,
	mapIntentEventName,
} from '#constants.ts';

export type MapHostIntent = { hasPopup: boolean; kind: 'target' } | { kind: 'open'; url: string };

const hostEventNames = {
	enter: mapEnterEventName,
	exit: mapExitEventName,
	expand: mapExpandEventName,
} as const;

export type MapHostEventName = keyof typeof hostEventNames;

// True when the host took the intent, which it says by cancelling the event
// eslint-disable-next-line unicorn/consistent-boolean-name -- a command that reports its result, not a predicate
export function sendHostIntent(intent: MapHostIntent) {
	return !document.dispatchEvent(
		new CustomEvent<MapHostIntent>(mapIntentEventName, { cancelable: true, detail: intent }),
	);
}

export function sendHostEvent(name: MapHostEventName) {
	document.dispatchEvent(new Event(hostEventNames[name]));
}
