import type { FC, MouseEvent } from 'react';

import type { MapFeatureOpenDetail } from '#types.ts';

import { useMapView } from '#canvas/canvas-view.tsx';
import { mapFeatureOpenEventName } from '#constants.ts';
import { MapIconAdd, MapIconClose } from '#lib/icons.tsx';
import { useMapMessages } from '#lib/messages.tsx';
import { useMapStoreActions } from '#store/store.ts';

export const MapScopeBar: FC = function MapScopeBar() {
	const { scope, scopeHeld } = useMapView();
	const { setScopeEnabled } = useMapStoreActions();
	const messages = useMapMessages();

	if (!scopeHeld) return;

	const { title, url } = scopeHeld;
	const isEnabled = scope !== undefined;
	const toggleLabel = isEnabled ? messages.scopeClearAriaLabel : messages.scopeRestoreAriaLabel;

	function handleNameClick(event: MouseEvent<HTMLAnchorElement>) {
		if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

		event.preventDefault();
		setScopeEnabled(true);

		const isOpened = !document.dispatchEvent(
			new CustomEvent<MapFeatureOpenDetail>(mapFeatureOpenEventName, {
				cancelable: true,
				detail: { url },
			}),
		);

		// Opening the page already in the Pane does nothing, so scroll to its top instead
		if (!isOpened && url === location.pathname) window.scrollTo({ top: 0 });
	}

	return (
		<div
			aria-label={isEnabled ? messages.scopeAriaLabel : messages.scopeOffAriaLabel}
			className="map-scope-bar"
			data-active={isEnabled ? '' : undefined}
			role="group"
		>
			<a className="map-scope-name" href={url} onClick={handleNameClick} title={title}>
				{title}
			</a>
			<button
				aria-label={toggleLabel}
				className="map-scope-toggle"
				onClick={() => {
					setScopeEnabled(!isEnabled);
				}}
				title={toggleLabel}
				type="button"
			>
				<span className="map-ctrl-icon-frame">
					<svg
						aria-hidden="true"
						className="map-ctrl-icon"
						viewBox="0 0 24 24"
						xmlns="http://www.w3.org/2000/svg"
					>
						{isEnabled ? <MapIconClose /> : <MapIconAdd />}
					</svg>
				</span>
			</button>
		</div>
	);
};
