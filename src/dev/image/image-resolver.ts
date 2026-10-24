import { renderImage } from '@spectralcodex/scripts/images-recipe';
import { getImageDerivatives, imageQualityByFormat } from '@spectralcodex/shared/images';
import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

interface DevImageOptions {
	builtPath: string | undefined;
	cachePath: string;
	mediaPath: string;
	render?: typeof renderImage;
}

const imageNamePattern = /^(?<stem>.+)-\d+(?:x\d+)?\.(?:jpg|webp)$/;

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

// Names drop the source extension, so the source is whichever file in that folder shares the stem
async function findSourceId(mediaPath: string, imagePath: string) {
	const stem = imageNamePattern.exec(imagePath)?.groups?.stem;

	if (!stem || imagePath.split('/').includes('..')) return;

	const directory = path.posix.dirname(stem);
	const names = await readDirectory(path.join(mediaPath, directory));
	const name = names.find((entry) => path.parse(entry).name === path.posix.basename(stem));

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
	render = renderImage,
}: DevImageOptions) {
	const inFlight = new Map<string, Promise<string | undefined>>();

	async function resolveImage(imagePath: string) {
		const id = await findSourceId(mediaPath, imagePath);

		if (!id) return;

		const sourcePath = path.join(mediaPath, id);

		if (builtPath) {
			const built = path.join(builtPath, imagePath);

			if (await isNewerThanSource(built, sourcePath)) return built;
		}

		const target = path.join(cachePath, imagePath);

		if (await isNewerThanSource(target, sourcePath)) return target;

		const { height, width } = await sharp(sourcePath).metadata();
		const derivative = getImageDerivatives({ height, id, width }).find(
			(candidate) => candidate.path === imagePath,
		);

		if (!derivative) return;

		const { data } = await render(sourcePath, {
			format: derivative.format,
			height: derivative.height,
			quality: imageQualityByFormat[derivative.format],
			width: derivative.width,
		});

		await writeImage(target, data);

		return target;
	}

	async function resolveOnce(imagePath: string) {
		try {
			return await resolveImage(imagePath);
		} finally {
			inFlight.delete(imagePath);
		}
	}

	return function getDevImage(imagePath: string) {
		const pending = inFlight.get(imagePath);

		if (pending) return pending;

		const request = resolveOnce(imagePath);

		inFlight.set(imagePath, request);

		return request;
	};
}
