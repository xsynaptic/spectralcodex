import type { LocationStatus } from '@spectralcodex/map-types';
import type { ReactNode } from 'react';
import type { CSSProperties } from 'react';

import { LocationStatusEnum } from '@spectralcodex/map-types';
import { createContext } from 'react';
import { useMemo, useState } from 'react';
import * as R from 'remeda';
import { createStore } from 'zustand';

type DOMCoordinates = Pick<DOMRect, 'x' | 'y'>;

interface MapDataState {
	/** Feature state */
	selectedId: string | undefined;
	hoveredId: string | undefined;
	/** Canvas */
	canvasCursor: NonNullable<CSSProperties['cursor']>;
	canvasInteractive: boolean;
	canvasClusters: boolean | undefined;
	canvasLoading: boolean;
	/** Filter */
	filterPosition: DOMCoordinates | undefined;
	filterOpen: boolean;
	statusFilter: Array<LocationStatus>;
	qualityFilter: number;
	ratingFilter: number;
	objectiveFilter: number;
	showObjectiveFilter: boolean;
}

/**
 * Accepted as props to the provider
 */
type MapDataConfigurableState = Pick<
	MapDataState,
	| 'selectedId'
	| 'hoveredId'
	| 'canvasCursor'
	| 'canvasInteractive'
	| 'canvasClusters'
	| 'filterOpen'
	| 'statusFilter'
	| 'qualityFilter'
	| 'ratingFilter'
	| 'objectiveFilter'
	| 'showObjectiveFilter'
>;

export interface MapDataStore extends MapDataState {
	actions: {
		setSelectedId: (selectedId: string | undefined) => void;
		setHoveredId: (hoveredId: string | undefined) => void;
		setCanvasCursor: (canvasCursor: NonNullable<CSSProperties['cursor']>) => void;
		setCanvasInteractive: (canvasInteractive: boolean) => void;
		setCanvasLoading: (canvasLoading: boolean) => void;
		setCanvasClusters: (canvasClusters: boolean | undefined) => void;
		setFilterPosition: (filterPosition: DOMCoordinates) => void;
		setFilterOpen: (filterOpen: boolean) => void;
		setStatusFilter: (statusFilter: Array<LocationStatus>) => void;
		toggleStatusFilter: (status: LocationStatus) => void;
		showAllStatusFilter: () => void;
		hideAllStatusFilter: () => void;
		setQualityFilter: (qualityFilter: number) => void;
		setRatingFilter: (ratingFilter: number) => void;
		setObjectiveFilter: (objectiveFilter: number) => void;
	};
}

const defaultMapDataState = {
	selectedId: undefined,
	hoveredId: undefined,
	/** Canvas */
	canvasCursor: 'grab',
	canvasInteractive: true,
	canvasLoading: true,
	canvasClusters: undefined,
	/** Filter */
	filterPosition: undefined,
	filterOpen: false,
	statusFilter: [],
	qualityFilter: 1,
	ratingFilter: 1,
	objectiveFilter: 1,
	showObjectiveFilter: false,
} satisfies MapDataState;

const useMapStoreSetup = ({
	initialState: initialStatePartial,
}: {
	initialState?: Partial<MapDataConfigurableState> | undefined;
}) => {
	const initialState = useMemo<MapDataState>(
		() => ({ ...defaultMapDataState, ...initialStatePartial }),
		[initialStatePartial],
	);

	const [mapStore] = useState(() =>
		createStore<MapDataStore>()((set, get) => ({
			...initialState,
			actions: {
				setSelectedId: (selectedId) => {
					set({
						selectedId,
						filterOpen: false,
					});
				},
				setHoveredId: (hoveredId) => {
					set({ hoveredId });
				},
				/**
				 * Canvas
				 */
				setCanvasCursor: (canvasCursor) => {
					set({ canvasCursor });
				},
				setCanvasInteractive: (canvasInteractive) => {
					set({ canvasInteractive });
				},
				setCanvasLoading: (canvasLoading) => {
					set({ canvasLoading });
				},
				setCanvasClusters(canvasClusters) {
					set({ canvasClusters });
				},
				/**
				 * Filters
				 */
				setFilterPosition: (filterPosition) => {
					set({ filterPosition });
				},
				setFilterOpen: (filterOpen) => {
					set({
						selectedId: undefined,
						filterOpen,
					});
				},
				setStatusFilter: (statusFilter) => {
					set({
						selectedId: undefined,
						statusFilter,
					});
				},
				toggleStatusFilter: (status) => {
					const statusFilter = get().statusFilter;

					set({
						selectedId: undefined,
						statusFilter: statusFilter.includes(status)
							? statusFilter.filter((statusFiltered) => statusFiltered !== status)
							: [...statusFilter, status],
					});
				},
				showAllStatusFilter: () => {
					set({
						selectedId: undefined,
						statusFilter: [],
					});
				},
				hideAllStatusFilter: () => {
					set({
						selectedId: undefined,
						statusFilter: R.values(LocationStatusEnum),
					});
				},
				setQualityFilter: (qualityFilter) => {
					set({
						selectedId: undefined,
						qualityFilter,
					});
				},
				setRatingFilter: (ratingFilter) => {
					set({
						selectedId: undefined,
						ratingFilter,
					});
				},
				setObjectiveFilter: (objectiveFilter) => {
					set({
						selectedId: undefined,
						objectiveFilter,
					});
				},
			},
		})),
	);

	return mapStore;
};

export const MapStoreContext = createContext<ReturnType<typeof useMapStoreSetup> | undefined>(
	undefined,
);

export const MapStoreProvider = ({
	initialState,
	children,
}: {
	initialState?: Partial<MapDataConfigurableState>;
	children: ReactNode;
}) => {
	const mapStore = useMapStoreSetup({ initialState });

	return <MapStoreContext.Provider value={mapStore}>{children}</MapStoreContext.Provider>;
};
