import type { OpenGraphCardTitles } from '@spectralcodex/shared/open-graph';
import type { ReactElement, ReactNode } from 'react';
import type { MeasuredNode, MeasuredTextRun } from 'takumi-js';

import { openGraphVariants } from '@spectralcodex/shared/open-graph';
import { Bitmap } from 'takumi-js/helpers/jsx';

import type { MeasureElement, OpenGraphSource, ProcessedImage } from '#og-image/generate.ts';

const isShowSafeZoneOverlay = false as boolean;

const brandLabel = 'Spectral Codex';

const luminanceThreshold = 190;

export const gradientWhite = 'linear-gradient(to bottom, #ffffff, #fef9ec)';

export const gradientButtercream = 'linear-gradient(to bottom, #fef9ec, #f4da93)';

export const landscapeBrandTokens = { fontSize: 26, letterSpacing: 56, top: 60 };

export const landscapeSafeZone = { bottom: 63, side: 120, top: 63 };

export function px(value: number): string {
	return `${String(value)}px`;
}

// Gradient text needs backgroundClip, which paints only inside the line box
export function gradientFill(gradient: string) {
	return { backgroundClip: 'text' as const, backgroundImage: gradient, color: 'transparent' };
}

function fillStyles(isInverted: boolean, color: string, gradient: string) {
	return isInverted ? { color } : gradientFill(gradient);
}

function isBrightBackground(luminance?: number): boolean {
	return !!luminance && luminance >= luminanceThreshold;
}

export function cropLandscape(source: OpenGraphSource | undefined, position: 'centre' | 'top') {
	const { height, width } = openGraphVariants.landscape;

	return source?.crop({
		...(source.isBlurred ? { blur: 16 } : {}),
		fit: 'cover',
		height,
		position,
		width,
	});
}

export function Frame({
	children,
	height,
	image,
	safeZone,
	scrim,
	width,
}: {
	children: ReactNode;
	height: number;
	image: ProcessedImage | undefined;
	safeZone: SafeZone;
	scrim: string;
	width: number;
}) {
	return (
		<div style={{ background: '#18181b', display: 'flex', height: px(height), width: px(width) }}>
			{image ? (
				<Bitmap
					data={image.data}
					height={image.height}
					style={{ position: 'absolute' }}
					width={image.width}
				/>
			) : undefined}
			<div
				style={{
					background: scrim,
					height: '100%',
					left: 0,
					position: 'absolute',
					top: 0,
					width: '100%',
				}}
			/>
			{children}
			{isShowSafeZoneOverlay ? (
				<SafeZoneOverlay height={height} width={width} zone={safeZone} />
			) : undefined}
		</div>
	);
}

interface SafeZone {
	bottom: number;
	side: number;
	top: number;
}

function SafeZoneOverlay({
	height,
	opacity = '0.5',
	width,
	zone,
}: {
	height: number;
	opacity?: string;
	width: number;
	zone: SafeZone;
}) {
	const overlayStyle = {
		background: `rgb(255, 0, 0, ${opacity})`,
		position: 'absolute' as const,
	};
	const middleHeight = px(height - zone.top - zone.bottom);

	return (
		<>
			<div
				style={{ ...overlayStyle, height: px(zone.top), left: '0px', top: '0px', width: px(width) }}
			/>
			<div
				style={{
					...overlayStyle,
					bottom: '0px',
					height: px(zone.bottom),
					left: '0px',
					width: px(width),
				}}
			/>
			<div
				style={{
					...overlayStyle,
					height: middleHeight,
					left: '0px',
					top: px(zone.top),
					width: px(zone.side),
				}}
			/>
			<div
				style={{
					...overlayStyle,
					height: middleHeight,
					left: px(width - zone.side),
					top: px(zone.top),
					width: px(zone.side),
				}}
			/>
		</>
	);
}

interface BrandTokens {
	fontSize: number;
	letterSpacing: number;
	top: number;
}

// Takumi floors the shadow blur radius and odd values lose their lower-right tail; keep every one even
// Letter spacing trails every character, so a matching left padding re-centers the label
export function TitleSite({
	luminance,
	tokens,
}: {
	luminance?: number | undefined;
	tokens: BrandTokens;
}) {
	const letterSpacing = px(tokens.letterSpacing);

	const isInverted = isBrightBackground(luminance);

	return (
		<div
			style={{
				color: isInverted ? 'rgb(24, 24, 27)' : '#ffffff',
				display: 'flex',
				fontFamily: 'Lora',
				fontSize: px(tokens.fontSize),
				fontWeight: 700,
				justifyContent: 'center',
				left: '0px',
				letterSpacing,
				lineHeight: 1.25,
				paddingLeft: letterSpacing,
				position: 'absolute',
				textShadow: isInverted
					? '0px 0px 4px rgb(220, 220, 225, 0.8)'
					: '0px 0px 4px rgb(12, 12, 14, 0.8)',
				top: px(tokens.top),
				width: '100%',
			}}
		>
			{brandLabel.toUpperCase().trim()}
		</div>
	);
}

// Each script gets its own face; `lang` also drives Han unification
const scriptStyles = {
	ja: { fontFamily: 'Zen Antique', fontWeight: 400, lang: 'ja', lineHeight: 1.25 },
	th: { fontFamily: 'Noto Serif Thai', fontWeight: 500, lang: 'th', lineHeight: 1 },
	zh: { fontFamily: 'Noto Serif TC', fontWeight: 700, lang: 'zh-Hant', lineHeight: 1.25 },
} as const;

type Script = keyof typeof scriptStyles;

interface ScriptTitle {
	script: Script;
	title: string;
}

export interface TitleTokens {
	fontSize: number;
	lineClamp: number;
	lineClampMultilingual: number;
	lineHeight: number;
	maxWidth: number;
	padding: string;
	paddingMultilingual: string;
	scriptFontSize: Record<Script, number>;
}

function resolveScript({
	titleJa,
	titleTh,
	titleZh,
}: OpenGraphCardTitles): ScriptTitle | undefined {
	if (titleZh) return { script: 'zh', title: titleZh };
	if (titleJa) return { script: 'ja', title: titleJa };
	if (titleTh) return { script: 'th', title: titleTh };

	return;
}

export function Title({
	luminance,
	title,
	tokens,
}: {
	luminance?: number | undefined;
	title: string;
	tokens: TitleTokens;
}) {
	const isInverted = isBrightBackground(luminance);

	return (
		<div
			style={{
				filter: isInverted
					? 'drop-shadow(0px 0px 6px rgb(240, 240, 245, 0.8))'
					: 'drop-shadow(1px 1px 6px rgb(24, 24, 27, 0.4))',
				fontFamily: 'Lora',
				fontSize: px(tokens.fontSize),
				fontWeight: 700,
				lineClamp: tokens.lineClamp,
				lineHeight: tokens.lineHeight,
				maxWidth: px(tokens.maxWidth),
				overflowWrap: 'break-word',
				padding: tokens.padding,
				textOverflow: 'ellipsis',
				...fillStyles(isInverted, 'rgb(24, 24, 27)', gradientWhite),
			}}
		>
			{title}
		</div>
	);
}

export function TitleMultilingual({
	luminance,
	scriptTitle,
	tokens,
}: {
	luminance?: number | undefined;
	scriptTitle: ScriptTitle | undefined;
	tokens: TitleTokens;
}) {
	if (!scriptTitle) return;

	const { lang, ...styles } = scriptStyles[scriptTitle.script];
	const isInverted = isBrightBackground(luminance);

	return (
		<div
			lang={lang}
			style={{
				filter: isInverted
					? 'drop-shadow(0px 0px 4px rgb(220, 220, 225, 0.7))'
					: 'drop-shadow(1px 1px 4px rgb(12, 12, 14, 0.6))',
				lineClamp: tokens.lineClampMultilingual,
				maxWidth: px(tokens.maxWidth),
				overflowWrap: 'break-word',
				padding: tokens.paddingMultilingual,
				textOverflow: 'ellipsis',
				...styles,
				fontSize: px(tokens.scriptFontSize[scriptTitle.script]),
				...fillStyles(isInverted, 'rgb(12, 12, 14)', gradientButtercream),
			}}
		>
			{scriptTitle.title}
		</div>
	);
}

// Takumi draws "..." in a face without "…", as Noto Serif Thai is
const clampMarkers = new Set(['...', '…']);

const wordEnd = /[\p{Script=Latin}\p{Nd}\p{Pd}]$/u;

const wordStart = /^[\p{Script=Latin}\p{Nd}]/u;

function collectRuns(node: MeasuredNode): Array<MeasuredTextRun> {
	return [...node.runs, ...node.children.flatMap((child) => collectRuns(child))];
}

// Takumi cuts mid-word; back off to the last whole word unless the script sets no spaces
function backOffToWord(fitted: string, rest: string, lastLine: string) {
	if (!wordEnd.test(fitted) || !wordStart.test(rest) || !lastLine.trim().includes(' ')) {
		return fitted;
	}

	return fitted.slice(0, fitted.lastIndexOf(' '));
}

// Takumi centres a clamped line before hanging the ellipsis on it, and can keep the space before it
export function getFittedText(text: string, lines: Array<string>) {
	const marker = lines.at(-1);

	if (marker === undefined || !clampMarkers.has(marker)) return text;

	const fittedLines = lines.slice(0, -1);

	let end = 0;

	for (const line of fittedLines) {
		const index = text.indexOf(line, end);

		if (index === -1) return text;

		end = index + line.length;
	}

	const fitted = backOffToWord(text.slice(0, end), text.slice(end), fittedLines.at(-1) ?? '');

	return `${fitted.replace(/[\s,;:\-–—…]+$/u, '')}${marker}`;
}

async function fitText(measure: MeasureElement, text: string, element: ReactElement) {
	const measured = await measure(
		<div style={{ alignItems: 'center', display: 'flex', flexDirection: 'column', width: '100%' }}>
			{element}
		</div>,
	);

	return getFittedText(
		text,
		collectRuns(measured).map((run) => run.text),
	);
}

export async function fitTitles(
	measure: MeasureElement,
	titles: OpenGraphCardTitles,
	tokens: TitleTokens,
) {
	const title = await fitText(
		measure,
		titles.title,
		<Title title={titles.title} tokens={tokens} />,
	);
	const resolved = resolveScript(titles);

	if (!resolved) return { scriptTitle: undefined, title };

	const scriptTitle = {
		script: resolved.script,
		title: await fitText(
			measure,
			resolved.title,
			<TitleMultilingual scriptTitle={resolved} tokens={tokens} />,
		),
	};

	return { scriptTitle, title };
}
