import { hyphenate as defaultHyphenate } from "./hyphenate";

export interface Token {
  /** The word/token text (may include trailing hyphen if hyphenated) */
  word: string;

  /** Starting index in the original text (0-indexed, excludes hyphen) */
  startIndex: number;

  /** Ending index in the original text (exclusive, excludes hyphen) */
  endIndex: number;
}

export interface TokenizeOptions {
  /** Maximum word length before hyphenation (default: 13) */
  maxWordLength?: number;

  /** Custom hyphenation function (receives word and maxWordLength) */
  hyphenator?: (word: string, maxWordLength: number) => string[];
}

/**
 * Tokenize text into words with position information
 *
 * Rules:
 * - Split on whitespace
 * - Preserve punctuation attached to words (e.g., "hello," stays as one token)
 * - Apply hyphenation to words exceeding maxWordLength
 *
 * Returns tokens with startIndex/endIndex pointing to the original text.
 * Note: indices exclude hyphens, so text[startIndex:endIndex] = word without hyphen
 */
export function tokenize(
  text: string,
  options?: TokenizeOptions
): Token[] {
  const maxWordLength = options?.maxWordLength ?? 13;
  const hyphenator = options?.hyphenator ?? defaultHyphenate;
  const tokens: Token[] = [];

  let currentIndex = 0;

  while (currentIndex < text.length) {
    // Skip whitespace
    if (/\s/.test(text[currentIndex])) {
      currentIndex++;
      continue;
    }

    // Find end of word (next whitespace)
    let wordEnd = currentIndex;
    while (wordEnd < text.length && !/\s/.test(text[wordEnd])) {
      wordEnd++;
    }

    const word = text.slice(currentIndex, wordEnd);

    // Hyphenate if needed
    if (word.length > maxWordLength) {
      const fragments = hyphenator(word, maxWordLength);
      let fragmentStartIndex = currentIndex;

      for (const fragment of fragments) {
        // Fragment may have trailing hyphen, but indices should not include it
        const withoutHyphen = fragment.endsWith("-")
          ? fragment.slice(0, -1)
          : fragment;

        tokens.push({
          word: fragment,
          startIndex: fragmentStartIndex,
          endIndex: fragmentStartIndex + withoutHyphen.length,
        });
        fragmentStartIndex += withoutHyphen.length;
      }
    } else {
      tokens.push({
        word,
        startIndex: currentIndex,
        endIndex: wordEnd,
      });
    }

    currentIndex = wordEnd;
  }

  return tokens;
}
