import type { ControlPosition } from 'react-map-gl/maplibre';

import { MapSpritesEnum } from '@spectralcodex/map-types';

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
					className={`text-primary-700 flex h-full w-full items-center justify-center ${canvasClusters ? '' : 'bg-primary-300 hover:bg-primary-200'}`}
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						className={`text-primary-700 h-[20px] ${canvasClusters ? '' : 'text-primary-600 mt-[1px]'}`}
						viewBox="0 0 24 24"
					>
						<use xlinkHref={`#${MapSpritesEnum.Clusters}`}></use>
					</svg>
				</div>
			</button>
		</CustomControlPortal>
	);
};
