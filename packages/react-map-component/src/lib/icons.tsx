import type { CSSProperties, FC, PropsWithChildren } from 'react';

export const MapControlIcon: FC<PropsWithChildren<{ style?: CSSProperties; viewBox?: string }>> =
	function MapControlIcon({ children, style, viewBox = '0 0 24 24' }) {
		return (
			<span className="map-ctrl-icon-frame">
				<svg
					aria-hidden="true"
					className="map-ctrl-icon"
					style={style}
					viewBox={viewBox}
					xmlns="http://www.w3.org/2000/svg"
				>
					{children}
				</svg>
			</span>
		);
	};

export const MapIconArrowBack: FC = function MapIconArrowBack() {
	return (
		<path d="M20 11v2H8l5.5 5.5l-1.42 1.42L4.16 12l7.92-7.92L13.5 5.5L8 11z" fill="currentColor" />
	);
};

export const MapIconClose: FC = function MapIconClose() {
	return (
		<path
			d="M7 7l10 10M17 7L7 17"
			fill="none"
			stroke="currentColor"
			strokeLinecap="round"
			strokeWidth="3"
		/>
	);
};

export const MapIconCopy: FC = function MapIconCopy() {
	return (
		<path
			d="M21 8.94a1.3 1.3 0 0 0-.06-.27v-.09a1 1 0 0 0-.19-.28l-6-6a1 1 0 0 0-.28-.19a.3.3 0 0 0-.09 0a.9.9 0 0 0-.33-.11H10a3 3 0 0 0-3 3v1H6a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3v-1h1a3 3 0 0 0 3-3zm-6-3.53L17.59 8H16a1 1 0 0 1-1-1ZM15 19a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1h1v7a3 3 0 0 0 3 3h5Zm4-4a1 1 0 0 1-1 1h-8a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h3v3a3 3 0 0 0 3 3h3Z"
			fill="currentColor"
		/>
	);
};

export const MapIconEye: FC = function MapIconEye() {
	return (
		<path
			d="M12 9a3 3 0 0 0-3 3a3 3 0 0 0 3 3a3 3 0 0 0 3-3a3 3 0 0 0-3-3m0 8a5 5 0 0 1-5-5a5 5 0 0 1 5-5a5 5 0 0 1 5 5a5 5 0 0 1-5 5m0-12.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5"
			fill="currentColor"
		/>
	);
};

export const MapIconEyeOff: FC = function MapIconEyeOff() {
	return (
		<path
			d="M11.83 9L15 12.16V12a3 3 0 0 0-3-3zm-4.3.8l1.55 1.55c-.05.21-.08.42-.08.65a3 3 0 0 0 3 3c.22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53a5 5 0 0 1-5-5c0-.79.2-1.53.53-2.2M2 4.27l2.28 2.28l.45.45C3.08 8.3 1.78 10 1 12c1.73 4.39 6 7.5 11 7.5c1.55 0 3.03-.3 4.38-.84l.43.42L19.73 22L21 20.73L3.27 3M12 7a5 5 0 0 1 5 5c0 .64-.13 1.26-.36 1.82l2.93 2.93c1.5-1.25 2.7-2.89 3.43-4.75c-1.73-4.39-6-7.5-11-7.5c-1.4 0-2.74.25-4 .7l2.17 2.15C10.74 7.13 11.35 7 12 7"
			fill="currentColor"
		/>
	);
};

export const MapIconFilters: FC = function MapIconFilters() {
	return (
		<path
			d="m2.5 8.86l9 5.2a1 1 0 0 0 1 0l9-5.2A1 1 0 0 0 22 8a1 1 0 0 0-.5-.87l-9-5.19a1 1 0 0 0-1 0l-9 5.19A1 1 0 0 0 2 8a1 1 0 0 0 .5.86M12 4l7 4l-7 4l-7-4Zm8.5 7.17L12 16l-8.5-4.87a1 1 0 0 0-1.37.37a1 1 0 0 0 .37 1.36l9 5.2a1 1 0 0 0 1 0l9-5.2a1 1 0 0 0 .37-1.36a1 1 0 0 0-1.37-.37Zm0 4L12 20l-8.5-4.87a1 1 0 0 0-1.37.37a1 1 0 0 0 .37 1.36l9 5.2a1 1 0 0 0 1 0l9-5.2a1 1 0 0 0 .37-1.36a1 1 0 0 0-1.37-.37Z"
			fill="currentColor"
		/>
	);
};

export const MapIconGoogle: FC = function MapIconGoogle() {
	return (
		<>
			<path
				d="M70.585 271.865a371 371 0 0 1 28.911 42.642c7.374 13.982 10.448 23.463 15.837 40.31c3.305 9.308 6.292 12.086 12.714 12.086c6.998 0 10.173-4.726 12.626-12.035c5.094-15.91 9.091-28.052 15.397-39.525c12.374-22.15 27.75-41.833 42.858-60.75c4.09-5.354 30.534-36.545 42.439-61.156c0 0 14.632-27.035 14.632-64.792c0-35.318-14.43-59.813-14.43-59.813l-41.545 11.126l-25.23 66.451l-6.242 9.163l-1.248 1.66l-1.66 2.078l-2.914 3.319l-4.164 4.163l-22.467 18.304l-56.17 32.432z"
				fill="#34A853"
			/>
			<path
				d="M12.612 188.892c13.709 31.313 40.145 58.839 58.031 82.995l95.001-112.534s-13.384 17.504-37.662 17.504c-27.043 0-48.89-21.595-48.89-48.825c0-18.673 11.234-31.501 11.234-31.501l-64.489 17.28z"
				fill="#FBBC04"
			/>
			<path
				d="M166.705 5.787c31.552 10.173 58.558 31.53 74.893 63.023l-75.925 90.478s11.234-13.06 11.234-31.617c0-27.864-23.463-48.68-48.81-48.68c-23.969 0-37.735 17.475-37.735 17.475v-57z"
				fill="#4285F4"
			/>
			<path
				d="M30.015 45.765C48.86 23.218 82.02 0 127.736 0c22.18 0 38.89 5.823 38.89 5.823L90.29 96.516H36.205z"
				fill="#1A73E8"
			/>
			<path
				d="M12.612 188.892S0 164.194 0 128.414c0-33.817 13.146-63.377 30.015-82.649l60.318 50.759z"
				fill="#EA4335"
			/>
		</>
	);
};

export const MapIconRating: FC = function MapIconRating() {
	return (
		<>
			<path
				className="clr-i-solid clr-i-solid-path-1"
				d="M34 16.78a2.22 2.22 0 0 0-1.29-4l-9-.34a.23.23 0 0 1-.2-.15l-3.11-8.4a2.22 2.22 0 0 0-4.17 0l-3.1 8.43a.23.23 0 0 1-.2.15l-9 .34a2.22 2.22 0 0 0-1.29 4l7.06 5.55a.23.23 0 0 1 .08.24l-2.43 8.61a2.22 2.22 0 0 0 3.38 2.45l7.46-5a.22.22 0 0 1 .25 0l7.46 5a2.2 2.2 0 0 0 2.55 0a2.2 2.2 0 0 0 .83-2.4l-2.45-8.64a.22.22 0 0 1 .08-.24Z"
				fill="currentColor"
			/>
			<path d="M0 0h36v36H0z" fill="none" />
		</>
	);
};

export const MapIconSearch: FC = function MapIconSearch() {
	return (
		<path
			d="M9.5 3A6.5 6.5 0 0 1 16 9.5c0 1.61-.59 3.09-1.56 4.23l.27.27h.79l5 5l-1.5 1.5l-5-5v-.79l-.27-.27A6.52 6.52 0 0 1 9.5 16A6.5 6.5 0 0 1 3 9.5A6.5 6.5 0 0 1 9.5 3m0 2C7 5 5 7 5 9.5S7 14 9.5 14S14 12 14 9.5S12 5 9.5 5"
			fill="currentColor"
		/>
	);
};

export const MapIconWarning: FC = function MapIconWarning() {
	return (
		<>
			<path
				className="clr-i-solid clr-i-solid-path-1"
				d="M30.33 25.54L20.59 7.6a3 3 0 0 0-5.27 0L5.57 25.54A3 3 0 0 0 8.21 30h19.48a3 3 0 0 0 2.64-4.43Zm-13.87-12.8a1.49 1.49 0 0 1 3 0v6.89a1.49 1.49 0 1 1-3 0ZM18 26.25a1.72 1.72 0 1 1 1.72-1.72A1.72 1.72 0 0 1 18 26.25"
				fill="currentColor"
			/>
			<path d="M0 0h36v36H0z" fill="none" />
		</>
	);
};

export const MapIconWikipedia: FC = function MapIconWikipedia() {
	return (
		<g
			color="currentColor"
			fill="none"
			stroke="currentColor"
			strokeLinecap="round"
			strokeLinejoin="round"
			strokeWidth="1.5"
		>
			<path d="M2.5 12c0-4.478 0-6.718 1.391-8.109S7.521 2.5 12 2.5c4.478 0 6.718 0 8.109 1.391S21.5 7.521 21.5 12c0 4.478 0 6.718-1.391 8.109S16.479 21.5 12 21.5c-4.478 0-6.718 0-8.109-1.391S2.5 16.479 2.5 12" />
			<path d="M5 8h1.05m0 0H7m-.95 0l2.577 6.82C9.177 16.275 9.451 17 9.9 17c.45 0 .724-.726 1.273-2.18L13.75 8h.75m-5 0h.75l2.577 6.82c.55 1.454.824 2.18 1.273 2.18c.45 0 .724-.726 1.273-2.18L17.95 8m0 0H17m.95 0H19" />
		</g>
	);
};
