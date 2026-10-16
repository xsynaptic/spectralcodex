import type { FC, Ref, RefObject } from 'react';

import { useLayoutEffect, useRef } from 'react';

import type { MapMessages, MapScope } from '#types.ts';

import { mapActiveAttribute, mapControlClassName } from '#constants.ts';
import { TopCenterControlPortal } from '#controls/controls-custom.tsx';
import { useOverlay } from '#controls/controls-overlay.ts';
import { useMapLinkClick } from '#host/host-click.ts';
import { useMapConfig } from '#lib/config.tsx';
import { MapControlIcon, MapIconEye, MapIconEyeOff, MapIconSearch } from '#lib/icons.tsx';
import { useTrackMap } from '#lib/track-hook.ts';
import { MapSearchBox } from '#search/search-box.tsx';
import { useMapStore } from '#store/store.tsx';

const telescopeDurationMs = 200;

const MapScopeHeld: FC<{ scope: MapScope }> = function MapScopeHeld({ scope: { title, url } }) {
	const isEnabled = useMapStore((state) => state.isScopeEnabled);
	const { setScopeEnabled } = useMapStore((state) => state.actions);
	const handleNameClick = useMapLinkClick(url);
	const { messages } = useMapConfig();
	const trackMap = useTrackMap();
	const toggleLabel = isEnabled ? messages.scopeClearAriaLabel : messages.scopeRestoreAriaLabel;

	return (
		<>
			<a
				className={`map-scope-button ${mapControlClassName.scopeName}`}
				href={url}
				onClick={handleNameClick}
				title={title}
			>
				{title}
			</a>
			<button
				aria-label={toggleLabel}
				className={`map-scope-button ${mapControlClassName.scopeToggle}`}
				onClick={() => {
					setScopeEnabled(!isEnabled);
					trackMap({ data: { enabled: !isEnabled }, name: 'map-scope-toggle' });
				}}
				title={toggleLabel}
				type="button"
			>
				<MapControlIcon>{isEnabled ? <MapIconEye /> : <MapIconEyeOff />}</MapControlIcon>
			</button>
		</>
	);
};

const MapScopeRest: FC<{ onOpen: () => void; openerRef: Ref<HTMLButtonElement> }> =
	function MapScopeRest({ onOpen, openerRef }) {
		const scopeHeld = useMapStore((state) => state.scope);
		const { messages } = useMapConfig();
		const searchLabel = scopeHeld ? messages.searchLabel : undefined;

		return (
			<>
				{scopeHeld ? <MapScopeHeld scope={scopeHeld} /> : undefined}
				<button
					aria-label={searchLabel}
					className={
						scopeHeld ? 'map-scope-button map-scope-search' : 'map-scope-button map-scope-prompt'
					}
					onClick={onOpen}
					ref={openerRef}
					title={searchLabel}
					type="button"
				>
					<MapControlIcon>
						<MapIconSearch />
					</MapControlIcon>
					{scopeHeld ? undefined : (
						<span className="map-scope-prompt-text">{messages.searchLabel}</span>
					)}
				</button>
			</>
		);
	};

function useTelescope(barRef: RefObject<HTMLDivElement | null>, layoutKey: string) {
	const widthRef = useRef<number>(undefined);

	useLayoutEffect(() => {
		const bar = barRef.current;

		if (!bar) return;

		const width = bar.getBoundingClientRect().width;
		const previous = widthRef.current;

		widthRef.current = width;

		if (previous === undefined || Math.abs(previous - width) < 1) return;
		if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

		bar.animate([{ width: `${String(previous)}px` }, { width: `${String(width)}px` }], {
			duration: telescopeDurationMs,
			easing: 'cubic-bezier(0.2, 0, 0, 1)',
		});
	}, [barRef, layoutKey]);
}

function getBarProps(messages: MapMessages, isOpen: boolean, isEnabled: boolean | undefined) {
	if (isOpen) return { 'data-open': '' };
	if (isEnabled === undefined) return {};

	return {
		'aria-label': isEnabled ? messages.scopeAriaLabel : messages.scopeOffAriaLabel,
		[mapActiveAttribute]: isEnabled ? '' : undefined,
		role: 'group',
	};
}

const MapScopeBarHosted: FC = function MapScopeBarHosted() {
	const scopeTitle = useMapStore((state) => state.scope?.title);
	const isEnabled = useMapStore((state) => state.isScopeEnabled);
	const { messages } = useMapConfig();
	const barRef = useRef<HTMLDivElement>(null);
	const { close, isOpen, open, openerRef, overlayRef } = useOverlay('search');

	useTelescope(barRef, `${String(isOpen)}:${scopeTitle ?? ''}`);

	return (
		<TopCenterControlPortal>
			<div
				className={mapControlClassName.scopeBar}
				ref={barRef}
				{...getBarProps(messages, isOpen, scopeTitle === undefined ? undefined : isEnabled)}
			>
				{isOpen ? (
					<MapSearchBox onClose={close} ref={overlayRef} />
				) : (
					<MapScopeRest onOpen={open} openerRef={openerRef} />
				)}
			</div>
		</TopCenterControlPortal>
	);
};

export const MapScopeBar: FC = function MapScopeBar() {
	const { host } = useMapConfig();

	return host.canOpen ? <MapScopeBarHosted /> : undefined;
};
