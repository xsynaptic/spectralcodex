import { stripTags } from '../html.js';

const sampleText = [
	[`No change to plain text`, `No change to plain text`],
	[`Emphasis <em>should</em> be removed`, `Emphasis should be removed`],
	[
		`This <a href="https://example.com">link</a> should be stripped`,
		`This link should be stripped`,
	],
	[
		`The following MDX component should not appear at all: <Img src="./test1.jpg" />`,
		`The following MDX component should not appear at all: `,
	],
] as const;

describe('html tags should be stripped', () => {
	for (const [input, output] of sampleText) {
		test(input, () => {
			expect(stripTags(input)).toEqual(output);
		});
	}
});
