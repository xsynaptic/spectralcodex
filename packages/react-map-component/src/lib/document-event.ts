import { useCallback, useSyncExternalStore } from 'react';

export function useDocumentEventValue<Value>(
	eventName: string,
	getSnapshot: () => Value,
	serverValue: Value,
) {
	const subscribe = useCallback(
		(callback: () => void) => {
			document.addEventListener(eventName, callback);

			return () => {
				document.removeEventListener(eventName, callback);
			};
		},
		[eventName],
	);

	return useSyncExternalStore(subscribe, getSnapshot, () => serverValue);
}
