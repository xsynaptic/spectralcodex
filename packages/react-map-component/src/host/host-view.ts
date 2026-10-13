import { mapSyncEventName, mapViewAttribute } from '#constants.ts';
import { useDocumentAttribute, useDocumentEventValue } from '#lib/document-attribute.ts';

export function useHostViewKey() {
	return useDocumentAttribute(mapViewAttribute, mapSyncEventName);
}

export function useHostSyncValue<Value>(getSnapshot: () => Value, serverValue: Value) {
	return useDocumentEventValue(mapSyncEventName, getSnapshot, serverValue);
}
