export class Refusal extends Error {
	override name = 'Refusal';
}

// Checks the name rather than using instanceof, which fails when two copies of the package are loaded
export function isRefusal(error: unknown): error is Refusal {
	return error instanceof Error && error.name === 'Refusal';
}
