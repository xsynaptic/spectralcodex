import type { FC, KeyboardEvent, ReactNode, RefObject } from 'react';

import { getNumberFormat } from '@spectralcodex/shared/i18n';
import { useEffect, useId, useRef, useState } from 'react';

import type { MapSearchResult, MapSearchText } from '#search/search-factory.ts';
import type { MapMessages, MapOverlayClose } from '#types.ts';

import { useMapConfig } from '#lib/config.tsx';
import { MapControlIcon, MapIconClose, MapIconSearch } from '#lib/icons.tsx';
import { useMapSearch } from '#search/search-hooks.ts';

const searchGapPx = 10;

const noResults: Array<MapSearchResult> = [];

const kindMessageKey = {
	location: 'searchKindLocation',
	region: 'searchKindRegion',
	series: 'searchKindSeries',
	theme: 'searchKindTheme',
} as const satisfies Record<MapSearchResult['kind'], keyof MapMessages>;

const MapSearchHighlight: FC<{ parenthesis?: boolean; text: MapSearchText }> =
	function MapSearchHighlight({ parenthesis = false, text: { ranges = [], text } }) {
		const parts: Array<ReactNode> = parenthesis ? ['('] : [];
		let cursor = 0;

		for (const [start, end] of ranges) {
			parts.push(
				text.slice(cursor, start),
				<mark className="map-search-match" key={start}>
					{text.slice(start, end)}
				</mark>,
			);
			cursor = end;
		}

		parts.push(text.slice(cursor));

		if (parenthesis) parts.push(')');

		return parts;
	};

const MapSearchOption: FC<{
	id: string;
	isActive: boolean;
	onActivate: () => void;
	onPick: () => void;
	result: MapSearchResult;
}> = function MapSearchOption({ id, isActive, onActivate, onPick, result }) {
	const { messages } = useMapConfig();

	return (
		<li
			aria-selected={isActive}
			className="map-search-option"
			id={id}
			onClick={onPick}
			onMouseMove={isActive ? undefined : onActivate}
			role="option"
		>
			<span className="map-search-line">
				<span className="map-search-title">
					<MapSearchHighlight text={result.title} />
					{result.titleMultilingual ? (
						<span className="map-search-title-multilingual">
							{' '}
							<MapSearchHighlight parenthesis={true} text={result.titleMultilingual} />
						</span>
					) : undefined}
				</span>
				{result.kind === 'location' ? undefined : (
					<span className="map-search-count">
						{getNumberFormat('en', undefined).format(result.count)}
						<span className="map-sr-only">
							{' '}
							{result.count === 1 ? messages.point : messages.points}
						</span>
					</span>
				)}
			</span>
			<span className="map-search-meta">
				<span className="map-search-kind">{messages[kindMessageKey[result.kind]]}</span>
				{result.parentTitle ? ` · ${result.parentTitle}` : undefined}
			</span>
		</li>
	);
};

function getStatus(messages: MapMessages, count: number) {
	if (count === 0) return messages.searchEmpty;

	return `${String(count)} ${count === 1 ? messages.searchResult : messages.searchResults}`;
}

// The list stops above the on-screen keyboard, which only the visual viewport reports
function useVisualViewportRoom(boxRef: RefObject<HTMLDivElement | null>) {
	useEffect(() => {
		const box = boxRef.current;
		const viewport = globalThis.visualViewport;

		if (!box || !viewport) return;

		const topPx = box.getBoundingClientRect().top;

		function update() {
			if (!box || !viewport) return;

			const roomPx = viewport.offsetTop + viewport.height - topPx - searchGapPx;

			box.style.setProperty('--map-search-room', `${String(roomPx)}px`);
		}

		update();
		// eslint-disable-next-line unicorn/prefer-observer-apis -- no observer reports the visual viewport
		viewport.addEventListener('resize', update);
		// eslint-disable-next-line unicorn/prefer-observer-apis -- no observer reports the visual viewport
		viewport.addEventListener('scroll', update);

		return () => {
			viewport.removeEventListener('resize', update);
			viewport.removeEventListener('scroll', update);
		};
	}, [boxRef]);
}

function useSearchKeys({
	getOptionId,
	onEnter,
	results,
}: {
	getOptionId: (result: MapSearchResult) => string;
	onEnter: (activeResult: MapSearchResult | undefined) => void;
	results: Array<MapSearchResult>;
}) {
	const [active, setActive] = useState({ index: 0, results });
	const activeIndex = active.results === results ? active.index : 0;
	const activeResult = results[activeIndex];

	function setActiveIndex(index: number) {
		setActive({ index, results });
	}

	function moveActive(step: number) {
		const next = Math.max(Math.min(activeIndex + step, results.length - 1), 0);
		const nextResult = results[next];

		setActiveIndex(next);

		if (!nextResult) return;

		document
			.querySelector(`#${CSS.escape(getOptionId(nextResult))}`)
			?.scrollIntoView({ block: 'nearest' });
	}

	const actionByKey: Record<string, () => void> = {
		ArrowDown: () => {
			moveActive(1);
		},
		ArrowUp: () => {
			moveActive(-1);
		},
		Enter: () => {
			onEnter(activeResult);
		},
	};

	function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
		const action = event.nativeEvent.isComposing ? undefined : actionByKey[event.key];

		if (!action) return;

		event.preventDefault();
		action();
	}

	return { activeIndex, activeResult, handleKeyDown, setActiveIndex };
}

const MapSearchClose: FC<{ onClose: (how: MapOverlayClose) => void }> = function MapSearchClose({
	onClose,
}) {
	const { messages } = useMapConfig();

	return (
		<button
			aria-label={messages.searchCloseAriaLabel}
			className="map-scope-button map-search-close"
			onClick={(event) => {
				onClose(event.detail === 0 ? 'keyboard' : 'pointer');
			}}
			title={messages.searchCloseAriaLabel}
			type="button"
		>
			<MapControlIcon>
				<MapIconClose />
			</MapControlIcon>
		</button>
	);
};

// The live region stays mounted so its first status is announced
const MapSearchStatus: FC<{ count: number | undefined }> = function MapSearchStatus({ count }) {
	const { messages } = useMapConfig();

	return (
		<>
			{count === 0 ? (
				<p aria-hidden="true" className="map-search-empty">
					{messages.searchEmpty}
				</p>
			) : undefined}
			<div aria-live="polite" className="map-sr-only">
				{count === undefined ? '' : getStatus(messages, count)}
			</div>
		</>
	);
};

export const MapSearchBox: FC<{
	onClose: (how: MapOverlayClose) => void;
	ref: RefObject<HTMLDivElement | null>;
}> = function MapSearchBox({ onClose, ref }) {
	const { messages } = useMapConfig();
	const listboxId = useId();
	const inputRef = useRef<HTMLInputElement>(null);
	const listRef = useRef<HTMLUListElement>(null);
	const [query, setQuery] = useState('');
	const { pick, pickOnEnter, results } = useMapSearch(query, onClose);
	const listedResults = results ?? noResults;

	function getOptionId(result: MapSearchResult) {
		return `${listboxId}-${result.key}`;
	}

	const { activeIndex, activeResult, handleKeyDown, setActiveIndex } = useSearchKeys({
		getOptionId,
		onEnter: pickOnEnter,
		results: listedResults,
	});

	useVisualViewportRoom(ref);

	useEffect(() => {
		inputRef.current?.focus();
	}, []);

	useEffect(() => {
		if (listRef.current) listRef.current.scrollTop = 0;
	}, [results]);

	return (
		<div className="map-search" ref={ref}>
			<div className="map-search-field">
				<span className="map-search-icon">
					<MapControlIcon>
						<MapIconSearch />
					</MapControlIcon>
				</span>
				<input
					aria-activedescendant={activeResult ? getOptionId(activeResult) : undefined}
					aria-autocomplete="list"
					aria-controls={listboxId}
					aria-expanded={listedResults.length > 0}
					aria-label={messages.searchLabel}
					autoComplete="off"
					className="map-search-input"
					enterKeyHint="go"
					onChange={(event) => {
						setQuery(event.target.value);
					}}
					onKeyDown={handleKeyDown}
					placeholder={messages.searchLabel}
					ref={inputRef}
					role="combobox"
					spellCheck={false}
					type="text"
					value={query}
				/>
				<MapSearchClose onClose={onClose} />
			</div>
			<ul
				aria-label={messages.searchListAriaLabel}
				className="map-search-list"
				hidden={listedResults.length === 0}
				id={listboxId}
				onMouseDown={(event) => {
					event.preventDefault();
				}}
				ref={listRef}
				role="listbox"
			>
				{listedResults.map((result, resultIndex) => (
					<MapSearchOption
						id={getOptionId(result)}
						isActive={resultIndex === activeIndex}
						key={result.key}
						onActivate={() => {
							setActiveIndex(resultIndex);
						}}
						onPick={() => {
							pick(result, 'pointer');
						}}
						result={result}
					/>
				))}
			</ul>
			<MapSearchStatus count={results?.length} />
		</div>
	);
};
