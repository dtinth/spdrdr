---
type: note
created: '2026-01-08T09:54:15.937Z'
---
## Plaintext Parser Implementation Complete

### Key Features
1. **Double newline splitting** - Paragraphs separated by \n\n (handles multiple blank lines)
2. **Line joining** - Multi-line paragraphs joined with spaces
3. **Whitespace normalization** - Trim + collapse multiple spaces
4. **Line number tracking** - externalId stores 1-indexed starting line number
5. **Empty paragraph skipping** - Ignores blank content

### Data Flow
- Input: Raw text with newlines
- Split on \n to track line numbers
- Group consecutive non-empty lines into paragraph
- Join with spaces and normalize whitespace
- Assign sequential IDs (1,2,3...) and line number as externalId

### Tests: 24 tests, 100% coverage
- Basic parsing: single/multiple paragraphs, blank line handling
- Multi-line paragraphs: line joining with various whitespace
- Block IDs: sequential, unique
- External IDs: line number tracking (1-indexed)
- Edge cases: empty input, tabs, trailing newlines
- Integration: realistic multi-paragraph text

### Note on externalId
Store starting line number so that caller can reference back to original source.
Useful for error reporting or highlighting source location.
