import type { FC } from 'react';

import { HostControlButton } from '#controls/controls-host.tsx';
import { useMapConfig } from '#lib/config.tsx';
import { useIsDarkMode } from '#lib/dark-mode.ts';

export const MapCanvasFallback: FC<{ messageKey: 'errorMessage' | 'unsupportedMessage' }> =
	function MapCanvasFallback({ messageKey }) {
		const { host, isInteractive, messages, style } = useMapConfig();
		const isDarkMode = useIsDarkMode();

		const controls = isInteractive ? host.controls.filter((name) => name !== 'enter') : [];

		return (
			<div
				className="maplibregl-map map-fallback"
				data-map-mode={isDarkMode ? 'dark' : 'light'}
				data-map-root=""
				style={{ width: '100%', ...style }}
			>
				<div className="maplibregl-ctrl-top-left">
					<p className="maplibregl-ctrl maplibregl-ctrl-group map-fallback-message" role="status">
						{messages[messageKey]}
					</p>
				</div>
				{controls.length > 0 ? (
					<div className="maplibregl-ctrl-top-right">
						{controls.map((name) => (
							<div className="maplibregl-ctrl maplibregl-ctrl-group" key={name}>
								<HostControlButton name={name} />
							</div>
						))}
					</div>
				) : undefined}
			</div>
		);
	};
