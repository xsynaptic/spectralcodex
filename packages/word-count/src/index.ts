/**
 * Multilingual word counter using a bitmap approach
 * Derived from alfaaz (https://github.com/thecodrr/alfaaz) by Abdullah Atta, MIT License
 *
 * Uses a Uint8Array bitmap to map Unicode codepoints to word boundaries
 * Each bit represents whether a codepoint is a word separator, reducing
 * memory from 205.7KB to 25.7KB (1 bit per codepoint instead of 1 byte)
 */
import { UNICODE_RANGES } from './unicode-ranges.ts';

const maxCodePoint = 205_743;
const byteSize = 8;

const bitmap = new Uint8Array(maxCodePoint / byteSize + 1);

function insertCharsIntoBitmap(...chars: Array<string>) {
	for (const char of chars) {
		const charCode = char.codePointAt(0) ?? 0;
		const byteIndex = Math.floor(charCode / byteSize);
		const bitIndex = charCode % byteSize;

		bitmap[byteIndex] = (bitmap[byteIndex] ?? 0) ^ (1 << bitIndex);
	}
}

function insertRangeIntoBitmap(from: number, to: number) {
	for (let index = from / byteSize; index < Math.ceil(to / byteSize); index++) {
		bitmap[index] = 0b1111_1111;
	}
}

// Word boundary characters
insertCharsIntoBitmap(
	' ',
	'\n',
	'\t',
	'\v',
	'*',
	'/',
	'&',
	':',
	';',
	'.',
	',',
	'?',
	'=',
	'\u0F0B', // Tibetan mark intersyllabic tsheg (signals end of syllable)
	'\u1361', // Ethiopic wordspace (indicates word boundaries)
	'\u200B', // Zero-width space (can also be a word boundary)
);

// Unicode language ranges where each character is a word/syllable
for (const range of UNICODE_RANGES) {
	insertRangeIntoBitmap(range[0], range[1]);
}

/**
 * Count words in a string with multilingual support
 * Handles Latin scripts (whitespace-delimited) and CJK/Thai/Lao/Burmese/Khmer/Javanese/Vai
 */
export function countWords(str: string): number {
	let count = 0;
	let shouldCount = false;

	for (let index = 0; index < str.length; ) {
		const charCode = str.codePointAt(index) ?? 0;
		const byteIndex = Math.floor(charCode / byteSize);
		const bitIndex = charCode % byteSize;
		const byteAtIndex = bitmap[byteIndex] ?? 0;
		const isMatch = ((byteAtIndex >> bitIndex) & 1) === 1;

		// 255 means this is a Unicode range match (every character is a word),
		// so count regardless of shouldCount state
		count += Number(isMatch && (shouldCount || byteAtIndex === 255));
		shouldCount = !isMatch;

		// Step by 2 for supplementary plane characters (surrogate pairs)
		index += charCode > 0xff_ff ? 2 : 1;
	}

	// Count the last word if string didn't end on a boundary
	count += Number(shouldCount);

	return count;
}
