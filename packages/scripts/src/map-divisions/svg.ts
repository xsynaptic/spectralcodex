import type { GeometryBoundingBox } from '@spectralcodex/shared/schemas';
import type { GeoPath } from 'd3-geo';
import type { Feature } from 'geojson';

import { bboxClip } from '@turf/bbox-clip';
import { featureCollection } from '@turf/helpers';
import { coordAll } from '@turf/meta';
import { rewind } from '@turf/rewind';
import { simplify } from '@turf/simplify';
import { formatCount, log } from '@xsynaptic/astro-scripts';
import { geoAzimuthalEqualArea, geoCentroid, geoPath } from 'd3-geo';
import fs from 'node:fs/promises';
import path from 'node:path';
import { optimize } from 'svgo';

import type { DivisionFeatureCollection, DivisionGeometry } from '#map-divisions/types.ts';

import { safelyCreateDirectory } from '#shared/files.ts';

interface SvgOptions {
	divisionClippingBBox?: GeometryBoundingBox;
}

const svgSize = 800;
const simplifyTolerancePixels = 2;
const minimumIslandAreaPixels = 4;

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

	log.detail(
		`Saved ${id}.svg (${formatCount(rawSvg.length)} → ${formatCount(optimized.data.length)} bytes, ${formatCount(pointCount)} points, tolerance ${String(tolerance)})`,
	);
}

function clipToBoundingBox(
	geojsonData: DivisionFeatureCollection,
	divisionClippingBBox: GeometryBoundingBox,
) {
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

	return featureCollection(clippedFeatures as Array<Feature<DivisionGeometry>>);
}

function dropIslandSpecks(collection: DivisionFeatureCollection, pathGenerator: GeoPath) {
	for (const feature of collection.features) {
		if (feature.geometry.type !== 'MultiPolygon') continue;

		feature.geometry.coordinates = feature.geometry.coordinates.filter(
			(polygon) =>
				pathGenerator.area({ coordinates: polygon, type: 'Polygon' }) >= minimumIslandAreaPixels,
		);
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
	const { divisionClippingBBox } = options;
	const clippedFeatureCollection = divisionClippingBBox
		? clipToBoundingBox(geojsonData, divisionClippingBBox)
		: geojsonData;

	// d3's spherical projections expect clockwise outer rings, the reverse of GeoJSON
	const rewound = rewind(clippedFeatureCollection, { reverse: true }) as DivisionFeatureCollection;

	const [centroidLng, centroidLat] = geoCentroid(rewound);
	const projection = geoAzimuthalEqualArea()
		.rotate([-centroidLng, -centroidLat])
		.fitSize([svgSize, svgSize], rewound);
	const pathGenerator = geoPath(projection);

	dropIslandSpecks(rewound, pathGenerator);

	// Dropped islands can tighten the frame, which the tolerance must follow
	projection.fitSize([svgSize, svgSize], rewound);

	const tolerance = ((simplifyTolerancePixels / projection.scale()) * 180) / Math.PI;

	const simplified = simplify(rewound, { highQuality: true, tolerance });

	// Simplifying can flip a ring's winding
	const corrected = rewind(simplified, { reverse: true }) as DivisionFeatureCollection;
	const pointCount = coordAll(corrected).length;

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

	return { pointCount, svg, tolerance };
}
