import type { LocationStatus } from '@spectralcodex/map-types';
import type { ReactNode } from 'react';

import { MapSpritesEnum } from '@spectralcodex/map-types';
import { memo, useMemo } from 'react';
import * as R from 'remeda';

import type { LocationStatusMetadata } from '../config/location';

import { locationStatusStyle } from '../config/colors';
import { LocationStatusRecords } from '../config/location';
import { translations } from '../config/translations';
import {
	useMapFilterOpen,
	useMapFilterPosition,
	useMapLanguages,
	useMapObjectiveFilter,
	useMapRatingFilter,
	useMapShowObjectiveFilter,
	useMapStatusFilter,
	useMapStoreActions,
} from '../store/hooks/use-map-store';

const MapFilterStatusMenuItem = memo(function MapFilterStatusMenuItem({
	status,
	isFiltered,
	data,
}: {
	status: LocationStatus;
	isFiltered: boolean;
	data: LocationStatusMetadata;
}) {
	const languages = useMapLanguages();

	const showChinese = useMemo(() => languages?.some((lang) => lang.startsWith('zh')), [languages]);

	const { toggleStatusFilter } = useMapStoreActions();

	return (
		<li
			className={`rounded-sm transition-colors ${isFiltered ? 'bg-primary-200 hover:bg-primary-300' : 'bg-primary-50 hover:bg-primary-100'}`}
		>
			<button
				className="flex w-full cursor-pointer items-center gap-1 px-1 py-1 select-none sm:py-0.5"
				onClick={() => {
					toggleStatusFilter(status);
				}}
			>
				<div
					className={`h-2 w-2 rounded-full border ${isFiltered ? 'opacity-60' : ''}`}
					style={{
						backgroundColor: locationStatusStyle[status].color,
						borderColor: locationStatusStyle[status].stroke,
					}}
				></div>
				<div
					className={`font-display flex w-full flex-nowrap items-center justify-between gap-1 text-xs sm:text-sm ${isFiltered ? 'text-primary-500' : 'text-primary-700'}`}
				>
					{showChinese ? (
						<>
							<span>{data.title}</span>
							<span
								className={`font-sans font-medium sm:text-xs ${isFiltered ? 'text-primary-400' : 'text-primary-600'}`}
							>
								{data.title_zh}
							</span>
						</>
					) : (
						data.title
					)}
				</div>
			</button>
		</li>
	);
});

const MapFilterStatusShowHideMenuItem = memo(function MapFilterStatusShowHideMenuItem({
	onClick,
	children,
}: {
	onClick: () => void;
	children: ReactNode;
}) {
	return (
		<li className="bg-primary-50 hover:bg-primary-100 rounded-sm transition-colors">
			<button
				className="flex w-full cursor-pointer items-center gap-1 px-1 py-1 select-none sm:py-0.5"
				onClick={onClick}
			>
				<div className={`border-primary-500 bg-primary-200 h-2 w-2 rounded-full border`}></div>
				<div
					className={`font-display text-primary-700 flex w-full flex-nowrap items-center justify-between gap-1 text-xs sm:text-sm`}
				>
					{children}
				</div>
			</button>
		</li>
	);
});

const MapFilterStatusShowHideMenu = () => {
	const mapLanguages = useMapLanguages();

	const showChinese = useMemo(
		() => mapLanguages?.some((lang) => lang.startsWith('zh')),
		[mapLanguages],
	);

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
						<span className="text-primary-600 font-sans font-medium sm:text-xs">
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
						<span className="text-primary-600 font-sans font-medium sm:text-xs">
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

const MapFilterRatingMenuItem = () => {
	const ratingFilterValue = useMapRatingFilter();

	const { setRatingFilter } = useMapStoreActions();

	return (
		<li>
			<div className="flex h-[20px] w-full items-center justify-center gap-2 px-1 select-none md:h-[24px]">
				{R.range(1, 6).map((value) => (
					<svg
						key={`rating-${String(value)}`}
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 36 36"
						className={`w-[16px] cursor-pointer transition-colors duration-200 ${ratingFilterValue >= value ? 'text-highlight-500 hover:text-highlight-300 focus:text-highlight-500' : 'text-primary-300 hover:text-highlight-300 focus:text-primary-300'}`}
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
			</div>
		</li>
	);
};

const MapFilterObjectiveMenuItem = () => {
	const objectiveFilter = useMapObjectiveFilter();
	const { setObjectiveFilter } = useMapStoreActions();

	return (
		<li className="rounded-sm transition-colors">
			<div className="flex w-full cursor-pointer items-center gap-1 select-none">
				{[1, 2, 3, 4, 5].map((value) => (
					<button
						className={`font-display text-primary-700 flex-1 rounded-full border text-xs ${objectiveFilter === value ? 'border-primary-400 bg-primary-300' : 'border-primary-300 bg-primary-200'}`}
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

export const MapControlsFilterMenu = ({
	filterPopupOffset = 8,
}: {
	filterPopupOffset?: number;
}) => {
	const filterPosition = useMapFilterPosition();
	const filterOpen = useMapFilterOpen();
	const statusFilter = useMapStatusFilter();
	const showObjectiveFilter = useMapShowObjectiveFilter();

	return filterOpen && filterPosition ? (
		<div
			className="maplibregl-popup maplibregl-popup-anchor-left"
			style={{
				maxWidth: 'min(350px, 80vw)',
				transform: `translate(0, -50%) translate(${String(filterPosition.x + filterPopupOffset)}px, ${String(filterPosition.y)}px)`,
			}}
		>
			<div className="maplibregl-popup-tip"></div>
			<div className="maplibregl-popup-content">
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
