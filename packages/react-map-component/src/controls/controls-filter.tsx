import type { LocationStatus } from '@spectralcodex/shared/map';
import type { FC, PropsWithChildren } from 'react';
import type { ControlPosition } from 'react-map-gl/maplibre';

import { MapSpritesEnum } from '@spectralcodex/shared/map';
import { memo, useEffect, useId, useRef } from 'react';
import * as R from 'remeda';

import type { LocationStatusMetadata } from '#lib/location-status.ts';

import { controlFilterId } from '#constants.ts';
import { CustomControlPortal } from '#controls/controls-custom.tsx';
import { useSourceDataQuery } from '#data/data-source.tsx';
import { useIsDarkMode } from '#lib/dark-mode.tsx';
import { LocationStatusRecords } from '#lib/location-status.ts';
import { useMapMessages } from '#lib/messages.tsx';
import {
	useIsMapCanvasLoading,
	useHasMapChineseLabels,
	useIsMapFilterOpen,
	useMapFilterPosition,
	useMapObjectiveFilter,
	useMapRatingFilter,
	useIsMapObjectiveFilterEnabled,
	useMapStatusFilter,
	useMapStoreActions,
} from '#store/store.ts';

// Bilingual secondary labels; kept local pending the deferred map-portability work
const chineseShowHideLabels = {
	showAll: '顯示全部',
	hideAll: '隱藏全部',
} as const;

const MapFilterMenuItem: FC<
	PropsWithChildren<{
		isActive?: boolean;
	}>
> = function MapFilterMenuItem({ isActive, children }) {
	return (
		<li
			className={
				isActive ? 'map-filter-menu-item map-filter-menu-item-active' : 'map-filter-menu-item'
			}
		>
			{children}
		</li>
	);
};

const MapFilterStatusMenuItem: FC<{
	status: LocationStatus;
	isFiltered: boolean;
	data: LocationStatusMetadata;
}> = memo(function MapFilterStatusMenuItem({ status, isFiltered, data }) {
	const isDarkMode = useIsDarkMode();

	const isShowChinese = useHasMapChineseLabels();

	const { toggleStatusFilter } = useMapStoreActions();

	return (
		<MapFilterMenuItem isActive={isFiltered}>
			<button
				type="button"
				className="map-filter-button"
				aria-pressed={!isFiltered}
				onClick={() => {
					toggleStatusFilter(status);
				}}
			>
				<span
					className="map-filter-swatch"
					style={{
						backgroundColor: isDarkMode
							? LocationStatusRecords[status].colorDark
							: LocationStatusRecords[status].color,
						borderColor: isDarkMode
							? LocationStatusRecords[status].strokeDark
							: LocationStatusRecords[status].stroke,
						...(isFiltered ? { opacity: 0.6 } : {}),
					}}
				></span>
				<span
					className={isFiltered ? 'map-filter-label map-filter-label-active' : 'map-filter-label'}
				>
					{isShowChinese ? (
						<>
							<span>{data.title}</span>
							<span
								className={
									isFiltered
										? 'map-filter-label-zh map-filter-label-zh-active'
										: 'map-filter-label-zh'
								}
							>
								{data.title_zh}
							</span>
						</>
					) : (
						data.title
					)}
				</span>
			</button>
		</MapFilterMenuItem>
	);
});

const MapFilterStatusShowHideMenuItem: FC<
	PropsWithChildren<{
		onClick: () => void;
	}>
> = memo(function MapFilterStatusShowHideMenuItem({ onClick, children }) {
	return (
		<MapFilterMenuItem>
			<button className="map-filter-button" onClick={onClick}>
				<span className="map-filter-swatch-showhide"></span>
				<span className="map-filter-label">{children}</span>
			</button>
		</MapFilterMenuItem>
	);
});

const MapFilterStatusShowHideMenu: FC = function MapFilterStatusShowHideMenu() {
	const isShowChinese = useHasMapChineseLabels();
	const messages = useMapMessages();

	const { hideAllStatusFilter, showAllStatusFilter } = useMapStoreActions();

	return (
		<>
			<MapFilterStatusShowHideMenuItem
				onClick={() => {
					showAllStatusFilter();
				}}
			>
				{isShowChinese ? (
					<>
						<span>{messages.showAll}</span>
						<span className="map-filter-label-zh">{chineseShowHideLabels.showAll}</span>
					</>
				) : (
					messages.showAll
				)}
			</MapFilterStatusShowHideMenuItem>
			<MapFilterStatusShowHideMenuItem
				onClick={() => {
					hideAllStatusFilter();
				}}
			>
				{isShowChinese ? (
					<>
						<span>{messages.hideAll}</span>
						<span className="map-filter-label-zh">{chineseShowHideLabels.hideAll}</span>
					</>
				) : (
					messages.hideAll
				)}
			</MapFilterStatusShowHideMenuItem>
		</>
	);
};

const MapFilterRatingMenuItem: FC = function MapFilterRatingMenuItem() {
	const ratingFilterValue = useMapRatingFilter();
	const messages = useMapMessages();

	const { setRatingFilter } = useMapStoreActions();

	return (
		<li>
			<span className="map-filter-rating">
				{R.range(1, 6).map((value) => (
					<button
						key={`rating-${String(value)}`}
						type="button"
						className={
							ratingFilterValue >= value ? 'map-filter-star-filled' : 'map-filter-star-empty'
						}
						aria-pressed={ratingFilterValue === value}
						aria-label={`${messages.ratingFilterAriaLabel} ${String(value)}`}
						onClick={() => {
							if (ratingFilterValue === value) {
								setRatingFilter(1);
							} else {
								setRatingFilter(value);
							}
						}}
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 36 36"
							className="map-filter-star-icon"
							aria-hidden="true"
						>
							<use href={`#${MapSpritesEnum.Rating}`}></use>
						</svg>
					</button>
				))}
			</span>
		</li>
	);
};

const MapFilterObjectiveMenuItem: FC = function MapFilterObjectiveMenuItem() {
	const objectiveFilter = useMapObjectiveFilter();
	const { setObjectiveFilter } = useMapStoreActions();

	return (
		<li>
			<div className="map-filter-objective-row">
				{[1, 2, 3, 4, 5].map((value) => (
					<button
						key={`objective-${String(value)}`}
						type="button"
						aria-pressed={objectiveFilter === value}
						className={
							objectiveFilter === value
								? 'map-filter-objective-button map-filter-objective-button-active'
								: 'map-filter-objective-button'
						}
						onClick={() => {
							setObjectiveFilter(value);
						}}
					>
						{value}
					</button>
				))}
			</div>
		</li>
	);
};

const MapControlsFilterMenu: FC<{
	id: string;
	filterPopupOffset?: number;
}> = function MapControlsFilterMenu({ id, filterPopupOffset = 8 }) {
	const filterPosition = useMapFilterPosition();
	const isFilterOpen = useIsMapFilterOpen();
	const statusFilter = useMapStatusFilter();
	const isObjectiveFilterEnabled = useIsMapObjectiveFilterEnabled();

	return isFilterOpen && filterPosition ? (
		<div
			id={id}
			className="maplibregl-popup maplibregl-popup-anchor-left map-filter-menu"
			style={{
				transform: `translate(0, -50%) translate(${String(filterPosition.x + filterPopupOffset)}px, ${String(filterPosition.y)}px)`,
			}}
		>
			<div className="maplibregl-popup-tip"></div>
			<div className="maplibregl-popup-content">
				<ul className="map-filter-menu-list">
					{R.entries(LocationStatusRecords).map(([status, data]) => (
						<MapFilterStatusMenuItem
							key={status}
							status={status}
							data={data}
							isFiltered={statusFilter.includes(status)}
						/>
					))}
					<MapFilterStatusShowHideMenu />
					<MapFilterRatingMenuItem />
					{isObjectiveFilterEnabled ? <MapFilterObjectiveMenuItem /> : undefined}
				</ul>
			</div>
		</div>
	) : undefined;
};

export const FilterControl: FC<{ position: ControlPosition }> = function FilterControl({
	position,
}) {
	const isCanvasLoading = useIsMapCanvasLoading();
	const isFilterOpen = useIsMapFilterOpen();
	const messages = useMapMessages();

	const { setFilterOpen } = useMapStoreActions();

	const { isLoading: isSourceDataLoading } = useSourceDataQuery();

	const isLoading = isSourceDataLoading || isCanvasLoading;

	const panelId = useId();
	const buttonRef = useRef<HTMLButtonElement>(null);

	useEffect(() => {
		if (!isFilterOpen) return;

		function onKeyDown(event: KeyboardEvent) {
			if (event.key !== 'Escape') return;

			// Focus returns only from inside this map; Escape elsewhere on the page leaves focus alone
			const mapRoot = buttonRef.current?.closest('[data-map-root]');
			const isFocusInMap = mapRoot?.contains(document.activeElement) ?? false;

			setFilterOpen(false);

			if (isFocusInMap) buttonRef.current?.focus();
		}

		document.addEventListener('keydown', onKeyDown);

		return () => {
			document.removeEventListener('keydown', onKeyDown);
		};
	}, [isFilterOpen, setFilterOpen]);

	return (
		<>
			<CustomControlPortal position={position}>
				<button
					ref={buttonRef}
					id={controlFilterId}
					type="button"
					className="maplibregl-ctrl-filter"
					disabled={isLoading}
					onClick={() => {
						if (!isLoading) setFilterOpen(!isFilterOpen);
					}}
					aria-label={messages.filterMenuAriaLabel}
					aria-expanded={isFilterOpen}
					aria-controls={panelId}
					{...(isFilterOpen ? {} : { 'data-umami-event': 'map-filter-open' })}
				>
					<span className="map-ctrl-icon-frame">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 24 24"
							className="map-ctrl-icon"
							style={{
								...(isFilterOpen ? { marginTop: '1px', opacity: '0.6' } : {}),
								...(isLoading ? { opacity: '0.6' } : {}),
							}}
							aria-hidden="true"
						>
							<use href={`#${MapSpritesEnum.Filters}`}></use>
						</svg>
					</span>
				</button>
			</CustomControlPortal>
			<MapControlsFilterMenu id={panelId} />
		</>
	);
};
