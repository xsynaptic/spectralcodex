#!/usr/bin/env tsx
import type { GeometryBoundingBox } from '@spectralcodex/map-types';

import { DuckDBConnection } from '@duckdb/node-api';
import chalk from 'chalk';
import fs from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';

import type { DivisionFeatureCollection, DivisionItem, RegionMetadata } from './types';

import { getCollection, loadDataStore } from '../content-utils/data-store';
import { parseRegionData, resolveBoundingBox } from './content';
import { fetchDivisionData, initializeDuckDB } from './duckdb';
import { saveFlatgeobuf } from './flatgeobuf';
import { convertToFeatureCollection } from './geojson';
import { saveSvg } from './svg';
import { safelyCreateDirectory } from './utils';

const { values } = parseArgs({
	args: process.argv.slice(2),
	options: {
		'root-path': {
			type: 'string',
			short: 'r',
			default: process.cwd(),
		},
		'output-path': {
			type: 'string',
			short: 'o',
			default: 'public/divisions',
		},
		'data-store-path': {
			type: 'string',
			short: 'd',
			default: '.astro/data-store.json',
		},
		'cache-path': {
			type: 'string',
			short: 'c',
			default: 'node_modules/.astro/divisions',
		},
		'overture-url': {
			type: 'string',
			short: 'u',
			default: '', // Note: this is required at runtime because the URL regularly changes!
		},
	},
});

const cachePath = path.join(values['root-path'], values['cache-path']);
const outputPath = path.join(values['root-path'], values['output-path']);

async function processRegions(
	db: DuckDBConnection,
	regions: Array<RegionMetadata>,
	regionsBySlug: Map<string, RegionMetadata>,
) {
	console.log(chalk.magenta(`\n=== Processing ${chalk.cyan(String(regions.length))} regions ===`));

	try {
		// Create output directory
		await safelyCreateDirectory(outputPath);

		// Check which regions need FGB or SVG files
		interface RegionProcessingNeeds {
			region: RegionMetadata;
			needsFgb: boolean;
			needsSvg: boolean;
		}

		const processingNeeds: Array<RegionProcessingNeeds> = [];

		for (const region of regions) {
			const fgbPath = path.join(outputPath, `${region.slug}.fgb`);
			const svgPath = path.join(cachePath, `${region.slug}.svg`);

			let needsFgb = false;
			let needsSvg = false;

			try {
				await fs.access(fgbPath);
			} catch {
				needsFgb = true;
			}

			try {
				await fs.access(svgPath);
			} catch {
				needsSvg = true;
			}

			if (needsFgb || needsSvg) {
				processingNeeds.push({ region, needsFgb, needsSvg });
			}
		}

		if (processingNeeds.length === 0) {
			console.log(chalk.green('All files already exist, skipping query'));

			return regions.length;
		}

		const regionsToProcess = processingNeeds.map((need) => need.region);

		console.log(
			chalk.blue(
				`Processing ${chalk.cyan(String(regionsToProcess.length))}/${chalk.cyan(String(regions.length))} regions`,
			),
		);

		// Group regions by resolved selection bounding box for batched processing
		const regionsBySelectionBBox = new Map<string, Array<RegionMetadata>>();

		for (const region of regionsToProcess) {
			// Resolve selection bbox hierarchically
			const selectionBBox = resolveBoundingBox(region, regionsBySlug, 'divisionSelectionBBox');

			if (!selectionBBox) {
				console.warn(
					chalk.yellow(`No selection bbox found for ${chalk.cyan(region.slug)} or its ancestors`),
				);
				continue;
			}

			// Use stringified bbox as grouping key
			const bboxKey = JSON.stringify(selectionBBox);
			if (!regionsBySelectionBBox.has(bboxKey)) {
				regionsBySelectionBBox.set(bboxKey, []);
			}
			regionsBySelectionBBox.get(bboxKey)!.push(region);
		}

		console.log(
			chalk.blue(`Processing ${chalk.cyan(String(regionsBySelectionBBox.size))} bbox groups...`),
		);

		let successCount = regions.length - regionsToProcess.length;

		// Process each region group with its bounding box
		for (const [bboxKey, bboxRegions] of regionsBySelectionBBox) {
			const selectionBBox = JSON.parse(bboxKey) as GeometryBoundingBox;

			console.log(
				chalk.magenta(
					`\n--- Processing bbox group (${chalk.cyan(String(bboxRegions.length))} regions) ---`,
				),
			);

			// Collect division IDs for this bbox group
			const divisionIds = new Set<string>();

			for (const region of bboxRegions) {
				for (const divisionId of region.divisionIds) {
					divisionIds.add(divisionId);
				}
			}

			// Fetch division data for this group
			const divisionsById = await fetchDivisionData({
				db,
				divisionIds,
				selectionBBox,
				cachePath,
				overtureUrl: values['overture-url'],
			});

			// Process each region in this group
			for (const region of bboxRegions) {
				console.log(chalk.blue(`\nProcessing ${chalk.cyan(region.slug)}...`));

				try {
					// Find what files this region needs
					const needs = processingNeeds.find((need) => need.region.slug === region.slug);

					if (!needs) {
						// Region doesn't need processing (both files exist)
						continue;
					}

					// Collect division items for this region
					const divisionItems: Array<DivisionItem> = [];

					for (const divisionId of region.divisionIds) {
						const divisionItem = divisionsById.get(divisionId);

						if (divisionItem) {
							divisionItems.push(divisionItem);
						} else {
							console.warn(
								chalk.yellow(`No division data found for division ID: ${chalk.cyan(divisionId)}`),
							);
						}
					}

					if (divisionItems.length > 0) {
						console.log(
							chalk.green(
								`Found ${chalk.cyan(String(divisionItems.length))}/${chalk.cyan(String(region.divisionIds.length))} division(s) for ${chalk.cyan(region.slug)}`,
							),
						);

						const divisionFeatureCollection = convertToFeatureCollection(divisionItems);

						// Save FGB if needed
						if (needs.needsFgb) {
							await saveFlatgeobuf(divisionFeatureCollection, region.slug, outputPath);
						} else {
							console.log(
								chalk.gray(`  Skipping FGB (already exists): ${chalk.cyan(region.slug)}`),
							);
						}

						// Save SVG if needed
						if (needs.needsSvg) {
							const divisionClippingBBox = resolveBoundingBox(
								region,
								regionsBySlug,
								'divisionClippingBBox',
							);

							await saveSvg({
								geojsonData: divisionFeatureCollection as DivisionFeatureCollection,
								slug: region.slug,
								outputDir: cachePath,
								options: divisionClippingBBox ? { divisionClippingBBox } : {},
							});
						} else {
							console.log(
								chalk.gray(`  Skipping SVG (already exists): ${chalk.cyan(region.slug)}`),
							);
						}

						console.log(chalk.green(`✓ Successfully processed ${chalk.cyan(region.slug)}`));

						successCount++;
					}
				} catch (error) {
					console.error(chalk.red(`✗ Failed to process ${chalk.cyan(region.slug)}:`), error);
				}
			}
		}

		return successCount;
	} catch (error) {
		console.error(chalk.red(`Error processing regions:`), error);
		throw error;
	}
}

async function mapDivisions() {
	if (values['overture-url'] === '') {
		console.error(chalk.red('Overture URL is required'));
		process.exit(1);
	}

	console.log(
		chalk.blue(
			`🗺️  Fetching administrative divisions from Overture Maps using release: ${chalk.cyan(values['overture-url'])}...`,
		),
	);

	try {
		// Load region data from data-store
		const dataStorePath = path.join(values['root-path'], values['data-store-path']);
		const { collections } = loadDataStore(dataStorePath);
		const regionEntries = getCollection(collections, 'regions');

		const { allRegions, regionsWithDivisionIds } = parseRegionData(regionEntries);

		if (regionsWithDivisionIds.length === 0) {
			console.log(chalk.yellow('No regions with division IDs found.'));
			return;
		}

		// Build lookup map from ALL regions (including those without divisionIds)
		// This enables hierarchical bbox resolution from parent regions
		const regionsBySlug = new Map(allRegions.map((region) => [region.slug, region]));

		// Initialize DuckDB connection
		const connection = await initializeDuckDB();

		const totalCount = regionsWithDivisionIds.length;

		// Process only regions with division IDs
		const successCount = await processRegions(connection, regionsWithDivisionIds, regionsBySlug);

		connection.disconnectSync();

		console.log(chalk.magenta(`\n=== Summary ===`));
		console.log(
			chalk.green(
				`Successfully processed: ${chalk.cyan(String(successCount))} / ${chalk.cyan(String(totalCount))} regions`,
			),
		);
		console.log(chalk.blue(`Output directory: ${chalk.cyan(values['output-path'])}`));

		if (successCount === totalCount) {
			console.log(chalk.green('🎉 All regions processed successfully!'));
		} else {
			console.log(chalk.yellow('⚠️  Some regions failed to process. Check the logs above.'));
			process.exit(1);
		}
	} catch (error) {
		console.error(chalk.red('❌ Script failed:'), error);
		process.exit(1);
	}
}

// Run the script
await mapDivisions();
