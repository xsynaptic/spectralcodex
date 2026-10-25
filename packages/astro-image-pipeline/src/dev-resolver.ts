import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

import type { ImageQuality } from '#image-manifest.ts';

import { isImageSource, parseImageName } from '#image-name.ts';
import { isWithinSource } from '#image-presets.ts';
import { readSourceSize, renderImage } from '#image-render.ts';

interface DevImageOptions {
	builtPath: string | undefined;
	cachePath: string;
	mediaPath: string;
	quality: ImageQuality;
	render?: typeof renderImage;
}

async function getModifiedTime(filePath: string) {
	try {
		const stats = await fs.stat(filePath);

		return stats.mtimeMs;
	} catch {
		return;
	}
}

async function readDirectory(directory: string) {
	try {
		return await fs.readdir(directory);
	} catch {
		return [];
	}
}

async function findSourceId(mediaPath: string, stem: string) {
	const directory = path.posix.dirname(stem);
	const names = await readDirectory(path.join(mediaPath, directory));
	const name = names.find(
		(entry) => isImageSource(entry) && path.parse(entry).name === path.posix.basename(stem),
	);

	return name === undefined ? undefined : path.posix.join(directory, name);
}

async function isNewerThanSource(target: string, sourcePath: string) {
	const [sourceTime, targetTime] = await Promise.all([
		getModifiedTime(sourcePath),
		getModifiedTime(target),
	]);

	return sourceTime !== undefined && targetTime !== undefined && targetTime >= sourceTime;
}

async function writeImage(target: string, data: Uint8Array) {
	const temporary = `${target}.${randomUUID()}.tmp`;

	await fs.mkdir(path.dirname(target), { recursive: true });
	await fs.writeFile(temporary, data);
	await fs.rename(temporary, target);
}

export function createDevImageResolver({
	builtPath,
	cachePath,
	mediaPath,
	quality,
	render = renderImage,
}: DevImageOptions) {
	const inFlight = new Map<string, Promise<string | undefined>>();

	async function resolveImage(name: string) {
		const parsed = parseImageName(name);

		if (!parsed) return;

		const id = await findSourceId(mediaPath, parsed.stem);

		if (!id) return;

		const sourcePath = path.join(mediaPath, id);

		if (builtPath) {
			const built = path.join(builtPath, name);

			if (await isNewerThanSource(built, sourcePath)) return built;
		}

		const target = path.join(cachePath, name);

		if (await isNewerThanSource(target, sourcePath)) return target;

		if (!isWithinSource(parsed, await readSourceSize(sourcePath))) return;

		const { data } = await render(sourcePath, {
			format: parsed.format,
			height: parsed.height,
			quality: quality[parsed.format],
			width: parsed.width,
		});

		await writeImage(target, data);

		return target;
	}

	async function resolveOnce(name: string) {
		try {
			return await resolveImage(name);
		} finally {
			inFlight.delete(name);
		}
	}

	return function getDevImage(name: string) {
		const pending = inFlight.get(name);

		if (pending) return pending;

		const request = resolveOnce(name);

		inFlight.set(name, request);

		return request;
	};
}
