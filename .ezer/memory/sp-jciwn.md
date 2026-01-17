---
type: note
created: '2026-01-17T13:44:33.306Z'
---
## HTML Parsing with Unified/HAST

Decision: Add unified/hast dependencies to implement robust HTML parsing.

This relaxes the 'zero runtime dependencies' constraint but provides:
- Robust HTML parsing with proper AST handling
- Built-in utilities for traversing and extracting text
- Edge case handling (malformed HTML, entities, etc.)
- Familiar syntax for web developers

Dependencies to add:
- unified: Parser/compiler framework
- rehype-parse: HTML parser for rehype
- hast-util-select: CSS selector queries on AST
- hast-util-to-text: Extract plain text from HAST

This enables proper heading detection and semantic block identification.
