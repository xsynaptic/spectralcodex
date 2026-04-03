/**
 * Unicode codepoint ranges for languages where characters represent whole words
 * or syllables (no whitespace word boundaries). Each range is [start, end].
 *
 * Derived from alfaaz (https://github.com/thecodrr/alfaaz) by Abdullah Atta, MIT License.
 */

// Source: https://en.wikipedia.org/wiki/Thai_(Unicode_block)
// Thai (Unicode block) 0E00-0E7F
const THAI_UNICODE_RANGE: Array<[number, number]> = [[3584, 3711]];

// Source: https://en.wikipedia.org/wiki/Lao_(Unicode_block)
// Lao (Unicode block) 0E80-0EFF
const LAO_UNICODE_RANGE: Array<[number, number]> = [[3712, 3839]];

// Source: https://en.wikipedia.org/wiki/Myanmar_(Unicode_block)
// Myanmar (Unicode block) 1000-109F
const BURMESE_UNICODE_RANGE: Array<[number, number]> = [[4096, 4255]];

// Source: https://en.wikipedia.org/wiki/Khmer_(Unicode_block)
// Khmer (Unicode block) 1780-17FF
const KHMER_UNICODE_RANGE: Array<[number, number]> = [[6016, 6143]];

// Source: https://en.wikipedia.org/wiki/Javanese_(Unicode_block)
// Javanese (Unicode block) A980-A9DF
const JAVANESE_UNICODE_RANGE: Array<[number, number]> = [[43_392, 43_487]];

// Source: https://en.wikipedia.org/wiki/Vai_(Unicode_block)
// Vai (Unicode block) A500-A63F
const VAI_UNICODE_RANGE: Array<[number, number]> = [[42_240, 42_559]];

// CJK Unified Ideographs and related blocks
const CJK_UNICODE_RANGES: Array<[number, number]> = [
	[19_968, 40_959], // CJK Unified Ideographs
	[13_312, 19_903], // CJK Unified Ideographs Extension A
	[131_072, 173_791], // CJK Unified Ideographs Extension B
	[173_824, 177_983], // CJK Unified Ideographs Extension C
	[177_984, 178_207], // CJK Unified Ideographs Extension D
	[178_208, 183_983], // CJK Unified Ideographs Extension E
	[183_984, 191_471], // CJK Unified Ideographs Extension F
	[196_608, 201_551], // CJK Unified Ideographs Extension G
	[201_552, 205_743], // CJK Unified Ideographs Extension H
	[63_744, 64_255], // CJK Compatibility Ideographs
	[194_560, 195_103], // CJK Compatibility Ideographs Supplement
	[12_032, 12_255], // CJK Radicals Supplement / Kangxi Radicals
	[11_904, 12_031], // Bopomofo
	[12_288, 12_351], // CJK Symbols and Punctuation
	[13_056, 13_311], // CJK Compatibility
	[65_072, 65_103], // CJK Compatibility Forms FE30-FE4F
];

export const UNICODE_RANGES: Array<[number, number]> = [
	...THAI_UNICODE_RANGE,
	...LAO_UNICODE_RANGE,
	...BURMESE_UNICODE_RANGE,
	...KHMER_UNICODE_RANGE,
	...JAVANESE_UNICODE_RANGE,
	...VAI_UNICODE_RANGE,
	...CJK_UNICODE_RANGES,
];
