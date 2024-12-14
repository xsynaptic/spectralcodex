import { Readable } from 'node:stream';
import { createGzip } from 'node:zlib';

export function generateApiResponse(data: string): Response {
	return new Response(data);
}

// This is not yet working properly in production; TODO: debug why
export function generateGzipApiResponse(data: string): Response {
	// Create a Readable stream from the JSON string
	const inputStream = Readable.from(data);

	// Create a Gzip transform stream
	const gzipStream = createGzip({ level: 9 });

	// Pipe the input through the Gzip stream
	const compressedStream = inputStream.pipe(gzipStream);

	// Return the compressed stream as a Response
	return new Response(compressedStream as unknown as ReadableStream, {
		headers: {
			'Content-Type': 'application/json',
			'Content-Encoding': 'gzip',
		},
	});
}
