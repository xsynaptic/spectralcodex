import type { FC } from 'react';

export const MapCanvasLoading: FC<{ loading: boolean }> = ({ loading }) => {
	return (
		<div className="flex h-full justify-center">
			<div
				className="loading w-[20%] transition-opacity duration-500"
				style={{ opacity: loading ? 1 : 0 }}
			/>
		</div>
	);
};
