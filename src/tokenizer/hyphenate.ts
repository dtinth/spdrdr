/**
 * Default hyphenation implementation
 *
 * Simple heuristic-based approach:
 * 1. Check for common prefixes (un-, re-, pre-, etc.)
 * 2. Check for common suffixes (-ing, -tion, -ment, etc.)
 * 3. Apply VCCV pattern (vowel-consonant-consonant-vowel splits)
 * 4. Fall back to fixed-interval splitting
 *
 * Parameters:
 * - word: the word to hyphenate
 * - maxWordLength: words at or below this length are not split (default: 13)
 *
 * Note: Last fragment should NOT have trailing hyphen
 */
export function hyphenate(word: string, maxWordLength: number = 13): string[] {
  if (word.length <= maxWordLength) {
    return [word];
  }

  const fragments: string[] = [];
  const commonPrefixes = ["un", "re", "pre", "anti", "dis", "mis"];
  const commonSuffixes = ["ing", "tion", "ment", "ness", "able", "ible"];

  // Try common prefix split
  for (const prefix of commonPrefixes) {
    if (word.startsWith(prefix) && word.length - prefix.length > 2) {
      fragments.push(prefix + "-");
      const rest = word.slice(prefix.length);
      return fragments.concat(hyphenate(rest, maxWordLength));
    }
  }

  // Try common suffix split
  for (const suffix of commonSuffixes) {
    if (word.endsWith(suffix) && word.length - suffix.length > 3) {
      const beforeSuffix = word.slice(0, word.length - suffix.length);
      return hyphenate(beforeSuffix, maxWordLength).map((f, i, arr) => {
        // Remove hyphen from last fragment and re-add
        const lastIsHyphenated = f.endsWith("-");
        const cleaned = lastIsHyphenated ? f.slice(0, -1) : f;
        return i === arr.length - 1 && i > 0 ? cleaned + "-" : f;
      }).concat([suffix]);
    }
  }

  // VCCV pattern (vowel-consonant-consonant-vowel)
  const vowels = "aeiouAEIOU";
  for (let i = 2; i < word.length - 2; i++) {
    const before = word[i - 1];
    const current = word[i];
    const next = word[i + 1];
    const after = word[i + 2];

    if (
      vowels.includes(before) &&
      !vowels.includes(current) &&
      !vowels.includes(next) &&
      vowels.includes(after)
    ) {
      fragments.push(word.slice(0, i + 1) + "-");
      return fragments.concat(hyphenate(word.slice(i + 1), maxWordLength));
    }
  }

  // Fall back to fixed-interval splitting (around 60% of word)
  const splitPoint = Math.ceil(word.length * 0.6);
  fragments.push(word.slice(0, splitPoint) + "-");
  return fragments.concat(hyphenate(word.slice(splitPoint), maxWordLength));
}
