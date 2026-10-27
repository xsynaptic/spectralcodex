import { modeAttribute, modeChangedEventName } from '@spectralcodex/shared/constants';

import { useDocumentEventValue } from '#lib/document-event.ts';

export function isDocumentDark() {
	return (
		typeof document !== 'undefined' &&
		document.documentElement.getAttribute(modeAttribute) === 'dark'
	);
}

export function useIsDarkMode() {
	return useDocumentEventValue(modeChangedEventName, isDocumentDark, isDocumentDark());
}
