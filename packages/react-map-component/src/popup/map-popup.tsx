import { memo, useCallback } from 'react';
import { Popup } from 'react-map-gl/maplibre';

import { MEDIA_QUERY_MOBILE } from '../constants';
import { useMediaQuery } from '../lib/hooks/use-media-query';
import {
	useMapPopupDataLoading,
	useMapPopupItem,
	useMapStoreActions,
} from '../store/hooks/use-map-store';
import { MapPopupContent } from './map-popup-content';

export const MapPopup = memo(function MapPopup() {
	const popupDataLoading = useMapPopupDataLoading();
	const popupItem = useMapPopupItem();
	const isMobile = useMediaQuery({ below: MEDIA_QUERY_MOBILE });

	const { setSelectedId } = useMapStoreActions();

	const onClose = useCallback(() => {
		setSelectedId(undefined);
	}, [setSelectedId]);

	// Note: `closeOnClick` must be false to better control popup display with custom events
	return popupItem ? (
		<Popup
			longitude={popupItem.popupCoordinates.lng}
			latitude={popupItem.popupCoordinates.lat}
			{...(isMobile
				? {
						anchor: 'top',
						offset: 10,
						maxWidth: `calc(min(300px, 80vw))`,
					}
				: {
						anchor: 'left',
						offset: 16,
						maxWidth: `calc(min(350px, 80vw))`,
					})}
			closeOnClick={false}
			onClose={onClose}
		>
			<div className="relative flex min-h-[80px] min-w-[200px] flex-col">
				<div className="p-small pointer-events-none absolute flex h-full w-full justify-center">
					<div
						className="loading max-w-[100%] transition-opacity duration-500"
						style={{ opacity: popupDataLoading ? 1 : 0 }}
					/>
				</div>
				{popupDataLoading ? undefined : <MapPopupContent />}
			</div>
		</Popup>
	) : undefined;
});
