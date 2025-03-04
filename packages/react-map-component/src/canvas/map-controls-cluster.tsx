import type { ControlPosition } from 'react-map-gl/maplibre';

import { MapSpritesEnum } from '../config/sprites';
import { MAP_CLUSTER_CONTROL_ID } from '../constants';
import { useMapCanvasClusters, useMapStoreActions } from '../store/hooks/use-map-store';
import { CustomControlPortal } from './map-controls-custom';

// TODO: still under development!
export const ClusterControl = ({ position }: { position: ControlPosition }) => {
	const { setCanvasClusters } = useMapStoreActions();

	const canvasClusters = useMapCanvasClusters();

	return (
		<CustomControlPortal position={position}>
			<button
				id={MAP_CLUSTER_CONTROL_ID}
				className="overflow-hidden"
				onClick={() => {
					setCanvasClusters(canvasClusters ? false : true);
				}}
			>
				<div
					className={`flex h-full w-full items-center justify-center text-primary-700 ${canvasClusters ? '' : 'bg-primary-300 hover:bg-primary-200'}`}
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						className={`h-[20px] text-primary-700 ${canvasClusters ? '' : 'mt-[1px] text-primary-600'}`}
						viewBox="0 0 24 24"
					>
						<use xlinkHref={`#${MapSpritesEnum.Clusters}`}></use>
					</svg>
				</div>
			</button>
		</CustomControlPortal>
	);
};
