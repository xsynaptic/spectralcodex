import type { PropsWithChildren } from 'react';

import { createContext, useContext } from 'react';

import { useDocumentAttribute } from '#lib/document-attribute.ts';

// Serializable dark-mode adapter; a function couldn't survive Astro island-prop serialization
export interface MapDarkModeOptions {
	attributeName?: string | undefined;
	darkValue?: string | undefined;
	eventName?: string | undefined;
}

const defaultAttributeName = 'data-mode';
const defaultEventName = 'mode-changed';
const defaultDarkValue = 'dark';

const DarkModeContext = createContext(false);

export function DarkModeProvider({
	children,
	darkMode,
}: PropsWithChildren<{ darkMode?: MapDarkModeOptions | undefined }>) {
	const attributeName = darkMode?.attributeName ?? defaultAttributeName;
	const eventName = darkMode?.eventName ?? defaultEventName;
	const darkValue = darkMode?.darkValue ?? defaultDarkValue;

	const isDarkMode = useDocumentAttribute(attributeName, eventName) === darkValue;

	return <DarkModeContext.Provider value={isDarkMode}>{children}</DarkModeContext.Provider>;
}

export function useIsDarkMode() {
	return useContext(DarkModeContext);
}
