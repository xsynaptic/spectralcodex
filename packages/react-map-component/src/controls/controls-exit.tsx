import type { FC } from 'react';
import type { ControlPosition } from 'react-map-gl/maplibre';

import { CustomControlPortal } from '#controls/controls-custom.tsx';
import { useMapMessages } from '#lib/messages.tsx';

export const ExitControl: FC<{
	eventName: string;
	position: ControlPosition;
}> = function ExitControl({ eventName, position }) {
	const messages = useMapMessages();

	return (
		<CustomControlPortal position={position}>
			<button
				aria-label={messages.exitAriaLabel}
				className="maplibregl-ctrl-exit"
				onClick={() => {
					document.dispatchEvent(new Event(eventName));
				}}
				title={messages.exitAriaLabel}
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
							d="M7 7l10 10M17 7L7 17"
							fill="none"
							stroke="currentColor"
							strokeLinecap="round"
							strokeWidth="3"
						/>
					</svg>
				</span>
			</button>
		</CustomControlPortal>
	);
};
