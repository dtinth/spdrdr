---
type: note
created: '2026-01-08T09:51:29.960Z'
---
## Tokenizer Implementation Complete

### Key Design Decisions

1. **Token interface with position tracking** - Each token includes:
   - `word`: The token text (may include trailing hyphen if hyphenated)
   - `startIndex`: Start position in original text (excludes hyphen)
   - `endIndex`: End position in original text (excludes hyphen)
   - This allows mapping back to source and highlighting

2. **Separated hyphenation concern** - Two functions:
   - `hyphenate(word, maxWordLength)`: Pure word-splitting logic with heuristics
   - `tokenize(text, options)`: Orchestrates whitespace splitting + hyphenation + position tracking

3. **Hyphenation heuristics** (in order):
   - Common prefix detection (un-, re-, pre-, anti-, dis-, mis-)
   - Common suffix detection (-ing, -tion, -ment, -ness, -able, -ible)
   - VCCV pattern matching (vowel-consonant-consonant-vowel splits)
   - Fixed-interval fallback (60% split)

4. **Position tracking with hyphens** - Indices point to actual text without hyphens, so:
   - Fragment 'inter-' has indices pointing to 'inter' only (5 chars not 6)
   - Allows text[startIndex:endIndex] to match word without hyphen

### Tests: 20 tests, 100% coverage for tokenize, 90.7% for hyphenate (some heuristic paths not hit)
- Basic tokenization: whitespace splitting, punctuation preservation
- Position tracking: verified all tokens map back to original text
- Hyphenation: respects maxWordLength, reconstructs original word
- Integration: complex text with mixed hyphenation
