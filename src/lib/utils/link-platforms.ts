interface LinkPlatform {
	match: string | Array<string>;
	title: string;
	title_zh?: string | undefined;
}

const linkPlatforms: Array<LinkPlatform> = [
	{ match: 'facebook.com', title: 'Facebook' },
	{ match: 'flickr.com', title: 'Flickr' },
	{ match: ['youtube.com', 'youtu.be'], title: 'YouTube' },
	{ match: 'x.com', title: 'X' },
	{ match: 'instagram.com', title: 'Instagram' },
	{ match: 'matters.town', title: 'Matters' },
	{ match: 'medium.com', title: 'Medium' },
	{ match: 'threads.com', title: 'Threads' },
	{ match: 'reddit.com', title: 'Reddit' },
	{ match: 'hiking.biji.co', title: 'Hiking Note', title_zh: '健康筆記' },
	{ match: 'home.gamer.com.tw', title: 'Bahamut', title_zh: '巴哈姆特' },
	{ match: 'vimeo.com', title: 'Vimeo' },
	{ match: 'vocus.cc', title: 'Vocus', title_zh: '方格子' },
	{ match: 'pixnet.net', title: 'Pixnet', title_zh: '痞客邦' },
];

export function getLinkPlatform(url: string): string | undefined {
	const platform = linkPlatforms.find((platform) =>
		typeof platform.match === 'string'
			? url.includes(platform.match)
			: platform.match.some((pattern) => url.includes(pattern)),
	);

	return platform?.title;
}
