import { LocationStatusEnum } from '@spectralcodex/map-types';
import { useMemo, useState } from 'react';
import * as R from 'remeda';
import { createStore } from 'zustand';

import type { MapDataConfigurableState, MapDataState, MapDataStore } from '../map-store-types';

import { getPopupItem } from '../map-store-utils';

const defaultState = {
	selectedId: undefined,
	/** Source */
	sourceData: [],
	sourceDataLoading: true,
	sourceDataCount: 0,
	/** Canvas */
	canvasCursor: 'grab',
	canvasInteractive: true,
	canvasLoading: true,
	canvasClusters: undefined,
	/** Popup  */
	popupData: [],
	popupDataLoading: true,
	popupItem: undefined,
	/** Filter */
	filterPosition: undefined,
	filterOpen: false,
	statusFilter: [],
	qualityFilter: 1,
	ratingFilter: 1,
	objectiveFilter: 1,
	showObjectiveFilter: false,
	/** Other */
	languages: ['en'],
} satisfies MapDataState;

export const useMapStoreSetup = ({
	initialState: initialStatePartial,
}: {
	initialState?: Partial<MapDataConfigurableState> | undefined;
}) => {
	const initialState = useMemo(
		() => ({ ...defaultState, ...initialStatePartial }),
		[initialStatePartial],
	);

	// TODO: persistent storage with the hash as key
	const [mapStore] = useState(() =>
		createStore<MapDataStore>()((set, get) => ({
			...initialState,
			actions: {
				setSelectedId: (selectedId) => {
					set({
						selectedId,
						popupItem: selectedId
							? getPopupItem({
									selectedId,
									sourceData: get().sourceData,
									popupData: get().popupData,
								})
							: undefined,
						filterOpen: false,
					});
				},
				/**
				 * Source data
				 */
				setSourceData(sourceData) {
					set({
						sourceData,
						sourceDataCount: sourceData.length,
					});
				},
				setSourceDataLoading(sourceDataLoading) {
					set({ sourceDataLoading });
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
				 * Popup
				 */
				setPopupData(popupData) {
					set({ popupData });
				},
				setPopupDataLoading(popupDataLoading) {
					set({ popupDataLoading });
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
				/**
				 * Other
				 */
				setLanguages(languages) {
					set({ languages });
				},
			},
		})),
	);

	return mapStore;
};
