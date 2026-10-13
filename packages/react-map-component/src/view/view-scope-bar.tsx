import type { FC, MouseEvent } from 'react';

import { sendHostIntent } from '#host/host-intent.ts';
import { MapIconEye, MapIconEyeOff } from '#lib/icons.tsx';
import { useMapMessages } from '#lib/messages.tsx';
import { useTrackMap } from '#lib/track-context.tsx';
import { useMapView } from '#view/view.tsx';

export const MapScopeBar: FC = function MapScopeBar() {
	const { scope, scopeHeld, setScopeEnabled } = useMapView();
	const messages = useMapMessages();
	const trackMap = useTrackMap();

	if (!scopeHeld) return;

	const { title, url } = scopeHeld;
	const isEnabled = scope !== undefined;
	const toggleLabel = isEnabled ? messages.scopeClearAriaLabel : messages.scopeRestoreAriaLabel;

	function handleNameClick(event: MouseEvent<HTMLAnchorElement>) {
		if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

		event.preventDefault();
		setScopeEnabled(true);
		sendHostIntent({ kind: 'open', url });
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
					trackMap({ data: { enabled: !isEnabled }, name: 'map-scope-toggle' });
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
						{isEnabled ? <MapIconEye /> : <MapIconEyeOff />}
					</svg>
				</span>
			</button>
		</div>
	);
};
