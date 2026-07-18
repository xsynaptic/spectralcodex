import type { LocationStatus } from '@spectralcodex/shared/map';
import type { FC, PropsWithChildren } from 'react';
import type { ControlPosition } from 'react-map-gl/maplibre';

import { MapSpritesEnum } from '@spectralcodex/shared/map';
import { memo } from 'react';
import * as R from 'remeda';

import type { LocationStatusMetadata } from '../lib/location-status';

import { CONTROL_FILTER_ID } from '../constants';
import { useSourceDataQuery } from '../data/data-source';
import { useDarkMode } from '../lib/dark-mode';
import { LocationStatusRecords } from '../lib/location-status';
import { useMapMessages } from '../lib/messages';
import {
	useMapCanvasLoading,
	useMapChineseLabels,
	useMapFilterOpen,
	useMapFilterPosition,
	useMapObjectiveFilter,
	useMapRatingFilter,
	useMapShowObjectiveFilter,
	useMapStatusFilter,
	useMapStoreActions,
} from '../store/store';
import { CustomControlPortal } from './controls-custom';

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
	const isDarkMode = useDarkMode();

	const showChinese = useMapChineseLabels();

	const { toggleStatusFilter } = useMapStoreActions();

	return (
		<MapFilterMenuItem isActive={isFiltered}>
			<button
				className="map-filter-button"
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
					{showChinese ? (
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
	const showChinese = useMapChineseLabels();
	const messages = useMapMessages();

	const { hideAllStatusFilter, showAllStatusFilter } = useMapStoreActions();

	return (
		<>
			<MapFilterStatusShowHideMenuItem
				onClick={() => {
					showAllStatusFilter();
				}}
			>
				{showChinese ? (
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
				{showChinese ? (
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

	const { setRatingFilter } = useMapStoreActions();

	return (
		<li>
			<span className="map-filter-rating">
				{R.range(1, 6).map((value) => (
					<svg
						key={`rating-${String(value)}`}
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 36 36"
						className={
							ratingFilterValue >= value ? 'map-filter-star-filled' : 'map-filter-star-empty'
						}
						style={{ width: '16px' }}
						onClick={() => {
							if (ratingFilterValue === value) {
								setRatingFilter(1);
							} else {
								setRatingFilter(value);
							}
						}}
					>
						<use href={`#${MapSpritesEnum.Rating}`}></use>
					</svg>
				))}
			</span>
		</li>
	);
};

const MapFilterObjectiveMenuItem: FC = function MapFilterObjectiveMenuItem() {
	const objectiveFilter = useMapObjectiveFilter();
	const { setObjectiveFilter } = useMapStoreActions();

	return (
		<li style={{ borderRadius: 'var(--map-radius-sm)' }}>
			<div
				style={{
					display: 'flex',
					width: '100%',
					cursor: 'pointer',
					alignItems: 'center',
					gap: '0.25rem',
					userSelect: 'none',
				}}
			>
				{[1, 2, 3, 4, 5].map((value) => (
					<button
						key={`objective-${String(value)}`}
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
	filterPopupOffset?: number;
}> = function MapControlsFilterMenu({ filterPopupOffset = 8 }) {
	const filterPosition = useMapFilterPosition();
	const filterOpen = useMapFilterOpen();
	const statusFilter = useMapStatusFilter();
	const showObjectiveFilter = useMapShowObjectiveFilter();

	return filterOpen && filterPosition ? (
		<div
			className="maplibregl-popup maplibregl-popup-anchor-left"
			style={{
				maxHeight: 'calc(100% - 40px)',
				maxWidth: 'min(350px, 80vw)',
				transform: `translate(0, -50%) translate(${String(filterPosition.x + filterPopupOffset)}px, ${String(filterPosition.y)}px)`,
				zIndex: 10,
			}}
		>
			<div className="maplibregl-popup-tip"></div>
			<div
				className="maplibregl-popup-content"
				style={{ boxShadow: '0 0 0 2px rgba(0, 0, 0, .1)' }}
			>
				<ul
					style={{
						display: 'flex',
						flexDirection: 'column',
						gap: '0.25rem',
						padding: '0.25rem',
					}}
				>
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
					{showObjectiveFilter ? <MapFilterObjectiveMenuItem /> : undefined}
				</ul>
			</div>
		</div>
	) : undefined;
};

export const FilterControl: FC<{ position: ControlPosition }> = function FilterControl({
	position,
}) {
	const isCanvasLoading = useMapCanvasLoading();
	const filterOpen = useMapFilterOpen();
	const messages = useMapMessages();

	const { setFilterOpen } = useMapStoreActions();

	const { isLoading: isSourceDataLoading } = useSourceDataQuery();

	const isLoading = isSourceDataLoading || isCanvasLoading;

	return (
		<>
			<CustomControlPortal position={position}>
				<button
					id={CONTROL_FILTER_ID}
					className="maplibregl-ctrl-filter"
					disabled={isLoading}
					onClick={() => {
						if (!isLoading) setFilterOpen(!filterOpen);
					}}
					aria-label={messages.filterMenuAriaLabel}
					{...(filterOpen ? {} : { 'data-umami-event': 'map-filter-open' })}
				>
					<span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 24 24"
							style={{
								height: '20px',
								width: '20px',
								...(filterOpen ? { marginTop: '1px', opacity: '0.6' } : {}),
								...(isLoading ? { opacity: '0.6' } : {}),
							}}
							aria-hidden="true"
						>
							<use href={`#${MapSpritesEnum.Filters}`}></use>
						</svg>
					</span>
				</button>
			</CustomControlPortal>
			<MapControlsFilterMenu />
		</>
	);
};
