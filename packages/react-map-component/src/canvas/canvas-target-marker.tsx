import type { LocationStatus } from '@spectralcodex/shared/map';
import type { FC } from 'react';

import { GeometryTypeEnum } from '@spectralcodex/shared/map';
import { useMemo } from 'react';
import { Marker } from 'react-map-gl/maplibre';

import { useSourceDataQuery } from '../data/data-source';
import { useDarkMode } from '../lib/dark-mode';
import { LocationStatusRecords } from '../lib/location-status';

export const MapTargetMarkers: FC<{
	targetIds: Array<string>;
}> = function MapTargetMarkers({ targetIds }) {
	const isDark = useDarkMode();

	const { data: sourceData } = useSourceDataQuery();

	const markers = useMemo(() => {
		if (!sourceData || targetIds.length === 0) return [];

		const idSet = new Set(targetIds);

		return sourceData.flatMap((item) => {
			if (item.geometry.type !== GeometryTypeEnum.Point) return [];

			const itemId = item.properties.id;
			const isMatch = idSet.has(itemId) || targetIds.some((id) => itemId.startsWith(`${id}-`));

			if (!isMatch) return [];

			const [lng, lat] = item.geometry.coordinates as [number, number];
			const record = LocationStatusRecords[item.properties.status as LocationStatus];

			return [{ longitude: lng, latitude: lat, color: isDark ? record.colorDark : record.color }];
		});
	}, [sourceData, targetIds, isDark]);

	if (markers.length === 0) return;

	return markers.map((marker) => (
		<Marker
			key={`${String(marker.longitude)}-${String(marker.latitude)}`}
			longitude={marker.longitude}
			latitude={marker.latitude}
			anchor="center"
		>
			<div
				style={{
					position: 'relative',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					pointerEvents: 'none',
				}}
			>
				<span
					style={{
						width: '32px',
						height: '32px',
						borderRadius: '50%',
						border: `2px solid ${marker.color}`,
						animation: 'target-pulse-ring 2s ease-out infinite',
					}}
				/>
			</div>
		</Marker>
	));
};
