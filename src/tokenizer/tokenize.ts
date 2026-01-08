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

    // Find end of word (next whitespace or slash)
    let wordEnd = currentIndex;
    while (wordEnd < text.length && !/[\s/]/.test(text[wordEnd])) {
      wordEnd++;
    }

    // Include trailing slash with the word
    let includeSlash = false;
    if (wordEnd < text.length && text[wordEnd] === "/") {
      includeSlash = true;
      wordEnd++;
    }

    const word = text.slice(currentIndex, wordEnd);

    // Hyphenate if needed (remove slash for hyphenation, then re-add to last fragment)
    let wordToHyphenate = word;
    let trailingSlash = "";

    if (includeSlash && word.endsWith("/")) {
      trailingSlash = "/";
      wordToHyphenate = word.slice(0, -1);
    }

    if (wordToHyphenate.length > maxWordLength) {
      const fragments = hyphenator(wordToHyphenate, maxWordLength);
      let fragmentStartIndex = currentIndex;

      for (let i = 0; i < fragments.length; i++) {
        let fragment = fragments[i];

        // Add slash back to the last fragment if we removed it
        if (i === fragments.length - 1 && trailingSlash) {
          fragment += trailingSlash;
        }

        // Fragment may have trailing hyphen or slash, but indices should not include them
        const withoutSuffixes = fragment.replace(/[-/]$/, "");

        tokens.push({
          word: fragment,
          startIndex: fragmentStartIndex,
          endIndex: fragmentStartIndex + withoutSuffixes.length,
        });
        fragmentStartIndex += withoutSuffixes.length;
      }
    } else {
      // Calculate endIndex (excluding slash if present)
      const endIndex = currentIndex + word.length - (includeSlash ? 1 : 0);
      tokens.push({
        word,
        startIndex: currentIndex,
        endIndex,
      });
    }

    currentIndex = wordEnd;
  }

  return tokens;
}
