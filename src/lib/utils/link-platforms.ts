interface LinkPlatform {
	match: string | Array<string>;
	name: string;
}

const linkPlatforms: Array<LinkPlatform> = [
	{ match: 'facebook.com', name: 'Facebook' },
	{ match: 'flickr.com', name: 'Flickr' },
	{ match: ['youtube.com', 'youtu.be'], name: 'YouTube' },
	{ match: 'x.com', name: 'X' },
	{ match: 'instagram.com', name: 'Instagram' },
	{ match: 'threads.com', name: 'Threads' },
	{ match: 'reddit.com', name: 'Reddit' },
	{ match: 'vimeo.com', name: 'Vimeo' },
];

export function getLinkPlatform(url: string): string | undefined {
	const platform = linkPlatforms.find((platform) =>
		typeof platform.match === 'string'
			? url.includes(platform.match)
			: platform.match.some((pattern) => url.includes(pattern)),
	);

	return platform?.name;
}
