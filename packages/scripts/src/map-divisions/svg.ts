import type { GeometryBoundingBox } from '@spectralcodex/shared/map';
import type { Feature } from 'geojson';

import { bboxClip } from '@turf/bbox-clip';
import { featureCollection } from '@turf/helpers';
import { coordAll } from '@turf/meta';
import { rewind } from '@turf/rewind';
import { simplify } from '@turf/simplify';
import chalk from 'chalk';
import { geoAzimuthalEqualArea, geoCentroid, geoPath } from 'd3-geo';
import fs from 'node:fs/promises';
import path from 'node:path';
import { optimize } from 'svgo';

import type { DivisionFeatureCollection, DivisionGeometry } from '#map-divisions/types.ts';

import { safelyCreateDirectory } from '#shared/utils.ts';

interface SvgOptions {
	divisionClippingBBox?: GeometryBoundingBox;
	height?: number;
	highQuality?: boolean;
	tolerance?: number;
	width?: number;
}

export async function saveSvg({
	geojsonData,
	id,
	options = {},
	outputDir,
}: {
	geojsonData: DivisionFeatureCollection;
	id: string;
	options?: SvgOptions;
	outputDir: string;
}): Promise<void> {
	safelyCreateDirectory(outputDir);

	const filePath = path.join(outputDir, `${id}.svg`);

	try {
		const { pointCount, svg: rawSvg, tolerance } = generateSvg(geojsonData, options);

		const optimized = optimize(rawSvg, {
			path: filePath,
			plugins: [
				{
					name: 'preset-default',
					params: {
						overrides: {
							convertColors: false,
						},
					},
				},
				{
					name: 'convertPathData',
					params: {
						floatPrecision: 1,
					},
				},
			],
		});

		await fs.writeFile(filePath, optimized.data, 'utf8');

		console.log(
			chalk.gray(
				`Saved SVG file to: ${chalk.cyan(filePath)} (${chalk.green(`${String(rawSvg.length)} → ${String(optimized.data.length)} bytes`)})  points: ${chalk.yellow(String(pointCount))}  tolerance: ${chalk.yellow(String(tolerance))}`,
			),
		);
	} catch (error) {
		console.error(chalk.red(`Failed to generate SVG for ${chalk.cyan(id)}:`), error);
		throw error;
	}
}

function generateSvg(
	geojsonData: DivisionFeatureCollection,
	options: SvgOptions = {},
): {
	pointCount: number;
	svg: string;
	tolerance: number;
} {
	const {
		divisionClippingBBox,
		height = 800,
		highQuality = true,
		tolerance = 0.0002,
		width = 800,
	} = options;

	let clippedFeatureCollection = geojsonData;

	if (divisionClippingBBox) {
		const clippedFeatures = geojsonData.features
			.map((feature) =>
				bboxClip(feature, [
					divisionClippingBBox.lngMin,
					divisionClippingBBox.latMin,
					divisionClippingBBox.lngMax,
					divisionClippingBBox.latMax,
				]),
			)
			.map((feature) => {
				if (feature.geometry.type === 'MultiPolygon') {
					const validPolygons = feature.geometry.coordinates.filter(
						(polygon) => polygon.length > 0 && (polygon[0]?.length ?? 0) > 0,
					);
					return {
						...feature,
						geometry: {
							...feature.geometry,
							coordinates: validPolygons,
						},
					};
				}
				return feature;
			})
			.filter(({ geometry }) => {
				if (!['MultiPolygon', 'Polygon'].includes(geometry.type)) return false;

				if (geometry.type === 'Polygon') {
					return geometry.coordinates.length > 0 && (geometry.coordinates[0]?.length ?? 0) > 0;
				}
				return geometry.coordinates.length > 0;
			});

		clippedFeatureCollection = featureCollection(
			clippedFeatures as Array<Feature<DivisionGeometry>>,
		);
	}

	const pointThreshold = 5000;
	const maxToleranceMultiplier = 5;

	const pointCount = coordAll(clippedFeatureCollection).length;
	const adaptiveTolerance =
		pointCount > pointThreshold
			? tolerance * Math.min(maxToleranceMultiplier, pointCount / pointThreshold)
			: tolerance;

	const simplified = simplify(clippedFeatureCollection, {
		highQuality,
		tolerance: adaptiveTolerance,
	});

	// d3's spherical projections expect clockwise outer rings, the reverse of GeoJSON, and simplifying can flip a ring's winding
	const corrected = rewind(simplified, {
		reverse: true,
	}) as DivisionFeatureCollection;

	const [centroidLng, centroidLat] = geoCentroid(corrected);
	const projection = geoAzimuthalEqualArea()
		.rotate([-centroidLng, -centroidLat])
		.fitSize([width, height], corrected);

	const pathGenerator = geoPath(projection);

	const bounds = pathGenerator.bounds(corrected);
	const [[x0, y0], [x1, y1]] = bounds;
	const buffer = 10;
	const viewBoxX = x0 - buffer;
	const viewBoxY = y0 - buffer;
	const viewBoxWidth = x1 - x0 + buffer * 2;
	const viewBoxHeight = y1 - y0 + buffer * 2;

	const pathData = corrected.features
		.map((feature) => pathGenerator(feature))
		.filter((path): path is string => path !== null)
		.join(' ');

	const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${String(viewBoxX)} ${String(viewBoxY)} ${String(viewBoxWidth)} ${String(viewBoxHeight)}" preserveAspectRatio="xMidYMid meet">
  <path d="${pathData}" fill="currentColor" stroke="var(--division-stroke-color, none)" stroke-width="var(--division-stroke-width, 0)" stroke-linecap="round" stroke-linejoin="round" />
</svg>`;

	return { pointCount, svg, tolerance: adaptiveTolerance };
}
