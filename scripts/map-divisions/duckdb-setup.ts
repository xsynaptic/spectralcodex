import { DuckDBConnection, DuckDBInstance } from '@duckdb/node-api';

export async function initializeDuckDB(): Promise<DuckDBConnection> {
	console.log('Initializing DuckDB...');

	try {
		// Create DuckDB instance with in-memory database
		const instance = await DuckDBInstance.create(':memory:');

		// Connect to the instance
		const connection = await instance.connect();

		// Install and load spatial extension
		await connection.run(`
			INSTALL spatial;
			LOAD spatial;
			SET enable_object_cache=true;
			INSTALL httpfs;
			LOAD httpfs;
		`);

		console.log('DuckDB initialized with spatial and httpfs extensions');

		return connection;
	} catch (error) {
		console.error('Failed to initialize DuckDB:', error);

		throw error;
	}
}
