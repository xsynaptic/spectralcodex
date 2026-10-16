import { modeAttribute, modeChangedEventName } from '@spectralcodex/shared/constants';

import { useDocumentEventValue } from '#lib/document-event.ts';

function isDocumentDark() {
	return document.documentElement.getAttribute(modeAttribute) === 'dark';
}

export function useIsDarkMode() {
	return useDocumentEventValue(modeChangedEventName, isDocumentDark, false);
}
