import type { LocationStatus, LocationStatusMetadata } from '@spectralcodex/shared/map';
import type { FC, PropsWithChildren, RefObject } from 'react';
import type { ControlPosition } from 'react-map-gl/maplibre';

import { locationStatusOrder, LocationStatusRecords } from '@spectralcodex/shared/map';
import { memo, useId, useLayoutEffect } from 'react';

import { mapActiveAttribute, mapControlClassName } from '#constants.ts';
import { CustomControlPortal } from '#controls/controls-custom.tsx';
import { useOverlay } from '#controls/controls-overlay.ts';
import { useIsMapLoading } from '#data/data-query.ts';
import { useMapConfig } from '#lib/config.tsx';
import { useIsDarkMode } from '#lib/dark-mode.ts';
import { MapControlIcon, MapIconFilters, MapIconRating } from '#lib/icons.tsx';
import { useTrackMap } from '#lib/track-hook.ts';
import { hasActiveFilter } from '#store/store-factory.ts';
import { useMapStore, useMapStoreApi } from '#store/store.tsx';

const chineseShowHideLabels = {
	hideAll: '隱藏全部',
	showAll: '顯示全部',
} as const;

const filterLevels = [1, 2, 3, 4, 5] as const;

function getActiveAttribute(isActive: boolean) {
	return { [mapActiveAttribute]: isActive ? '' : undefined };
}

const MapFilterLabel: FC<{ title: string; titleZh: string }> = function MapFilterLabel({
	title,
	titleZh,
}) {
	const isShowChinese = useMapConfig().languages.some((language) => language.startsWith('zh'));

	return (
		<span className="map-filter-label">
			<span>{title}</span>
			{isShowChinese ? <span className="map-filter-label-zh">{titleZh}</span> : undefined}
		</span>
	);
};

const MapFilterMenuItem: FC<PropsWithChildren<{ isActive?: boolean }>> =
	function MapFilterMenuItem({ children, isActive = false }) {
		return (
			<li className="map-filter-menu-item" {...getActiveAttribute(isActive)}>
				{children}
			</li>
		);
	};

const MapFilterStatusMenuItem: FC<{
	data: LocationStatusMetadata;
	isFiltered: boolean;
	status: LocationStatus;
}> = memo(function MapFilterStatusMenuItem({ data, isFiltered, status }) {
	const isDarkMode = useIsDarkMode();
	const store = useMapStoreApi();
	const { setFilter } = useMapStore((state) => state.actions);

	return (
		<MapFilterMenuItem isActive={isFiltered}>
			<button
				aria-pressed={!isFiltered}
				className="map-filter-button"
				onClick={() => {
					const hidden = store.getState().filter.status;

					setFilter({
						status: isFiltered
							? hidden.filter((hiddenStatus) => hiddenStatus !== status)
							: [...hidden, status],
					});
				}}
				type="button"
			>
				<span
					className="map-filter-swatch"
					style={{
						backgroundColor: isDarkMode ? data.colorDark : data.color,
						borderColor: isDarkMode ? data.strokeDark : data.stroke,
					}}
				></span>
				<MapFilterLabel title={data.title} titleZh={data.title_zh} />
			</button>
		</MapFilterMenuItem>
	);
});

const MapFilterStatusShowHideMenu: FC = function MapFilterStatusShowHideMenu() {
	const { messages } = useMapConfig();
	const { setFilter } = useMapStore((state) => state.actions);

	return (
		<>
			<MapFilterMenuItem>
				<button
					className="map-filter-button"
					onClick={() => {
						setFilter({ status: [] });
					}}
					type="button"
				>
					<span className="map-filter-swatch-showhide"></span>
					<MapFilterLabel title={messages.showAll} titleZh={chineseShowHideLabels.showAll} />
				</button>
			</MapFilterMenuItem>
			<MapFilterMenuItem>
				<button
					className="map-filter-button"
					onClick={() => {
						setFilter({ status: locationStatusOrder });
					}}
					type="button"
				>
					<span className="map-filter-swatch-showhide"></span>
					<MapFilterLabel title={messages.hideAll} titleZh={chineseShowHideLabels.hideAll} />
				</button>
			</MapFilterMenuItem>
		</>
	);
};

const MapFilterRatingMenuItem: FC = function MapFilterRatingMenuItem() {
	const rating = useMapStore((state) => state.filter.rating);
	const { messages } = useMapConfig();
	const { setFilter } = useMapStore((state) => state.actions);

	return (
		<li>
			<span className={mapControlClassName.filterRating}>
				{filterLevels.map((value) => (
					<button
						aria-label={`${messages.ratingFilterAriaLabel} ${String(value)}`}
						aria-pressed={rating === value}
						className="map-filter-star"
						key={value}
						onClick={() => {
							setFilter({ rating: rating === value ? 1 : value });
						}}
						type="button"
						{...getActiveAttribute(rating >= value)}
					>
						<svg
							aria-hidden="true"
							className="map-filter-star-icon"
							viewBox="0 0 36 36"
							xmlns="http://www.w3.org/2000/svg"
						>
							<MapIconRating />
						</svg>
					</button>
				))}
			</span>
		</li>
	);
};

const MapFilterObjectiveMenuItem: FC = function MapFilterObjectiveMenuItem() {
	const objective = useMapStore((state) => state.filter.objective);
	const { setFilter } = useMapStore((state) => state.actions);

	return (
		<li>
			<div className="map-filter-objective-row">
				{filterLevels.map((value) => (
					<button
						aria-pressed={objective === value}
						className="map-filter-objective-button"
						key={value}
						onClick={() => {
							setFilter({ objective: value });
						}}
						type="button"
					>
						{value}
					</button>
				))}
			</div>
		</li>
	);
};

const filterMenuOffsetPx = 8;

function useFilterMenuPlacement(
	menuRef: RefObject<HTMLDivElement | null>,
	openerRef: RefObject<HTMLButtonElement | null>,
) {
	useLayoutEffect(() => {
		const menu = menuRef.current;
		const parent = menu?.offsetParent;
		const opener = openerRef.current;

		if (!menu || !parent || !opener) return;

		const { x: parentX, y: parentY } = parent.getBoundingClientRect();
		const { height, width, x, y } = opener.getBoundingClientRect();

		menu.style.setProperty(
			'--map-filter-x',
			`${String(x - parentX + width + filterMenuOffsetPx)}px`,
		);
		menu.style.setProperty('--map-filter-y', `${String(y - parentY + height / 2)}px`);
	}, [menuRef, openerRef]);
}

const MapControlsFilterMenu: FC<{
	id: string;
	openerRef: RefObject<HTMLButtonElement | null>;
	ref: RefObject<HTMLDivElement | null>;
}> = function MapControlsFilterMenu({ id, openerRef, ref }) {
	const hiddenStatuses = useMapStore((state) => state.filter.status);
	const isObjectiveFilterEnabled = useMapConfig().isObjectiveFilterEnabled;

	useFilterMenuPlacement(ref, openerRef);

	return (
		<div
			className="maplibregl-popup maplibregl-popup-anchor-left map-filter-menu"
			id={id}
			ref={ref}
		>
			<div className="maplibregl-popup-tip"></div>
			<div className="maplibregl-popup-content">
				<ul className="map-filter-menu-list">
					{locationStatusOrder.map((status) => (
						<MapFilterStatusMenuItem
							data={LocationStatusRecords[status]}
							isFiltered={hiddenStatuses.includes(status)}
							key={status}
							status={status}
						/>
					))}
					<MapFilterStatusShowHideMenu />
					<MapFilterRatingMenuItem />
					{isObjectiveFilterEnabled ? <MapFilterObjectiveMenuItem /> : undefined}
				</ul>
			</div>
		</div>
	);
};

export const FilterControl: FC<{ position: ControlPosition }> = function FilterControl({
	position,
}) {
	const isFilterActive = useMapStore(hasActiveFilter);
	const isLoading = useIsMapLoading();
	const { messages } = useMapConfig();
	const trackMap = useTrackMap();
	const panelId = useId();
	const { close, isOpen, open, openerRef, overlayRef } = useOverlay('filter');

	return (
		<>
			<CustomControlPortal position={position}>
				<button
					aria-controls={panelId}
					aria-expanded={isOpen}
					aria-label={
						isFilterActive ? messages.filterMenuActiveAriaLabel : messages.filterMenuAriaLabel
					}
					className={mapControlClassName.filter}
					disabled={isLoading}
					onClick={(event) => {
						if (isLoading) return;

						if (isOpen) {
							close(event.detail === 0 ? 'keyboard' : 'pointer');
							return;
						}

						trackMap({ name: 'map-filter-open' });
						open();
					}}
					ref={openerRef}
					type="button"
				>
					<MapControlIcon
						style={{
							...(isOpen ? { marginTop: '1px', opacity: '0.6' } : {}),
							...(isLoading ? { opacity: '0.6' } : {}),
						}}
					>
						<MapIconFilters />
					</MapControlIcon>
					<span
						className="map-filter-indicator"
						{...{ [mapActiveAttribute]: isFilterActive ? '' : undefined }}
					></span>
				</button>
			</CustomControlPortal>
			{isOpen ? (
				<MapControlsFilterMenu id={panelId} openerRef={openerRef} ref={overlayRef} />
			) : undefined}
		</>
	);
};
