import type { ControlPosition } from 'react-map-gl/maplibre';

import { translations } from '../config/translations';
import { useMapSourceDataCount, useMapSourceDataLoading } from '../store/hooks/use-map-store';
import { useMapCanvasData } from './hooks/use-map-canvas-data';
import { CustomControlPortal } from './map-controls-custom';

export const formatNumber = ({
	number,
	locales,
	options,
}: {
	number: string | number;
	locales?: Intl.LocalesArgument | undefined;
	options?: Intl.NumberFormatOptions | undefined;
}) => new Intl.NumberFormat(locales ?? 'en', options).format(Number(number));

export const MetricsControl = ({ position }: { position: ControlPosition }) => {
	const sourceDataLoading = useMapSourceDataLoading();
	const sourceDataCount = useMapSourceDataCount();
	const { filteredCount } = useMapCanvasData();
	const formatNumber = new Intl.NumberFormat('en');

	return (
		<CustomControlPortal position={position} className="maplibregl-ctrl">
			{sourceDataLoading ? (
				<div className="flex flex-col items-end">
					<div className="loading w-[15px]" />
				</div>
			) : (
				<div className="flex select-none flex-nowrap gap-1 font-sans text-xs mix-blend-difference">
					<span className="text-primary-600 drop-shadow-sm">
						{formatNumber.format(filteredCount)}
					</span>
					<span className="font-light text-primary-400 drop-shadow-sm">/</span>
					<span className="text-primary-600 drop-shadow-sm">
						{formatNumber.format(sourceDataCount)} {translations.locations}
					</span>
				</div>
			)}
		</CustomControlPortal>
	);
};
