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
import { translations } from '../lib/translations';
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

const MapFilterMenuItem: FC<
	PropsWithChildren<{
		isActive?: boolean;
	}>
> = function MapFilterMenuItem({ isActive, children }) {
	return (
		<li
			className={`rounded-sm transition-colors ${isActive ? 'bg-primary-200 hover:bg-primary-300 dark:bg-primary-800 dark:hover:bg-primary-700' : 'bg-primary-50 hover:bg-primary-100 dark:bg-primary-900 dark:hover:bg-primary-800'}`}
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
				className="flex w-full cursor-pointer items-center gap-1 px-1 py-1 select-none sm:py-0.5"
				onClick={() => {
					toggleStatusFilter(status);
				}}
			>
				<span
					className={`h-2 w-2 rounded-full border ${isFiltered ? 'opacity-60' : ''}`}
					style={{
						backgroundColor: isDarkMode
							? LocationStatusRecords[status].colorDark
							: LocationStatusRecords[status].color,
						borderColor: isDarkMode
							? LocationStatusRecords[status].strokeDark
							: LocationStatusRecords[status].stroke,
					}}
				></span>
				<span
					className={`flex w-full flex-nowrap items-center justify-between gap-2 font-display text-xs sm:text-sm ${isFiltered ? 'text-primary-500 dark:text-primary-400' : 'text-primary-700 dark:text-primary-300'}`}
				>
					{showChinese ? (
						<>
							<span>{data.title}</span>
							<span
								className={`font-sans font-medium sm:text-xs ${isFiltered ? 'text-primary-400 dark:text-primary-500' : 'text-primary-600 dark:text-primary-400'}`}
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
			<button
				className="flex w-full cursor-pointer items-center gap-1 px-1 py-1 select-none sm:py-0.5"
				onClick={onClick}
			>
				<span className={`h-2 w-2 rounded-full border border-primary-500 bg-primary-200`}></span>
				<span
					className={`flex w-full flex-nowrap items-center justify-between gap-2 font-display text-xs text-primary-700 sm:text-sm dark:text-primary-300`}
				>
					{children}
				</span>
			</button>
		</MapFilterMenuItem>
	);
});

const MapFilterStatusShowHideMenu: FC = function MapFilterStatusShowHideMenu() {
	const showChinese = useMapChineseLabels();

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
						<span>{translations.showAll}</span>
						<span className="font-sans font-medium text-primary-600 sm:text-xs dark:text-primary-400">
							{translations.showAllAlt}
						</span>
					</>
				) : (
					translations.showAll
				)}
			</MapFilterStatusShowHideMenuItem>
			<MapFilterStatusShowHideMenuItem
				onClick={() => {
					hideAllStatusFilter();
				}}
			>
				{showChinese ? (
					<>
						<span>{translations.hideAll}</span>
						<span className="font-sans font-medium text-primary-600 sm:text-xs dark:text-primary-400">
							{translations.hideAllAlt}
						</span>
					</>
				) : (
					translations.hideAll
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
			<span className="flex h-[20px] w-full items-center justify-center gap-2 px-1 select-none md:h-[24px]">
				{R.range(1, 6).map((value) => (
					<svg
						key={`rating-${String(value)}`}
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 36 36"
						className={`cursor-pointer transition-colors duration-200 ${ratingFilterValue >= value ? 'text-highlight-500 hover:text-highlight-300 focus:text-highlight-500' : 'text-primary-300 hover:text-highlight-300 focus:text-primary-300 dark:text-primary-600 dark:focus:text-primary-400'}`}
						style={{ width: '16px' }}
						onClick={() => {
							if (ratingFilterValue === value) {
								setRatingFilter(1);
							} else {
								setRatingFilter(value);
							}
						}}
					>
						<use xlinkHref={`#${MapSpritesEnum.Rating}`}></use>
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
		<li className="rounded-sm transition-colors">
			<div className="flex w-full cursor-pointer items-center gap-1 select-none">
				{[1, 2, 3, 4, 5].map((value) => (
					<button
						key={`objective-${String(value)}`}
						className={`flex-1 rounded-full border font-display text-xs text-primary-700 ${objectiveFilter === value ? 'border-primary-400 bg-primary-300' : 'border-primary-300 bg-primary-200'}`}
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
				<ul className="flex flex-col gap-1 px-1 py-1">
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
					aria-label={translations.filterMenuAriaLabel}
				>
					<span className="flex items-center justify-center">
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
							<use xlinkHref={`#${MapSpritesEnum.Filters}`}></use>
						</svg>
					</span>
				</button>
			</CustomControlPortal>
			<MapControlsFilterMenu />
		</>
	);
};
