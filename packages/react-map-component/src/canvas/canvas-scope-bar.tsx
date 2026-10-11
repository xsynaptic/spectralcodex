import type { FC, MouseEvent } from 'react';

import { useMap } from 'react-map-gl/maplibre';

import type { MapFeatureOpenDetail } from '#types.ts';

import { useMapView } from '#canvas/canvas-view.tsx';
import { mapFeatureOpenEventName } from '#constants.ts';
import { useMapMessages } from '#lib/messages.tsx';
import { useMapStoreActions } from '#store/store.ts';

export const MapScopeBar: FC = function MapScopeBar() {
	const { current: map } = useMap();
	const { scope } = useMapView();
	const { clearScope } = useMapStoreActions();
	const messages = useMapMessages();

	if (!scope) return;

	const { title, url } = scope;

	function handleNameClick(event: MouseEvent<HTMLAnchorElement>) {
		if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

		event.preventDefault();

		// Opening the page already in the Pane does nothing, so scroll to its top instead
		if (url === location.pathname) {
			window.scrollTo({ top: 0 });
			return;
		}

		document.dispatchEvent(
			new CustomEvent<MapFeatureOpenDetail>(mapFeatureOpenEventName, { detail: { url } }),
		);
	}

	function handleClearClick() {
		// Clearing the Scope removes this button; without a new home, keyboard focus falls to the body
		map?.getCanvas().focus({ preventScroll: true });
		clearScope();
	}

	return (
		<div aria-label={messages.scopeAriaLabel} className="map-scope-bar" role="group">
			<a className="map-scope-name" href={url} onClick={handleNameClick} title={title}>
				{title}
			</a>
			<button
				aria-label={messages.scopeClearAriaLabel}
				className="map-scope-clear"
				onClick={handleClearClick}
				title={messages.scopeClearAriaLabel}
				type="button"
			>
				<span className="map-ctrl-icon-frame">
					<svg
						aria-hidden="true"
						className="map-ctrl-icon"
						viewBox="0 0 24 24"
						xmlns="http://www.w3.org/2000/svg"
					>
						<path
							d="M8 8l8 8M16 8l-8 8"
							fill="none"
							stroke="currentColor"
							strokeLinecap="round"
							strokeWidth="2"
						/>
					</svg>
				</span>
			</button>
		</div>
	);
};
