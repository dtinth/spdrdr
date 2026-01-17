---
type: note
created: '2026-01-17T14:24:53.274Z'
---
## List Support and HTML Parser Improvements

### Features Implemented

1. **HTML List Support**
   - <ul><li> items prefixed with • bullet
   - <ol><li> items numbered (1., 2., 3., etc.)
   - Nested lists fully supported with correct numbering context
   - Direct text extraction for li items (excludes nested lists)

2. **Fixed Div Handling**
   - Divs now treated as layout containers, not content blocks
   - Recurse into div children instead of extracting all text at once
   - Handles nested divs: div > main > div > content
   - Real-world HTML from webpages now parses correctly

### Problem Solved
When pasting HTML from webpages (like GitHub docs), all content in divs was being collapsed into a single block. Now:
- Headings, paragraphs, and lists are properly separated
- Nested layout divs are transparent to parsing
- Semantic content blocks are extracted correctly

### Test Coverage
- 36 HTML parser tests (was 27)
- Added 8 list tests
- Added 2 realistic structure tests (article with lists, div with numbered list)
- 212 total tests passing (was 210)
- 100% coverage on HTML parser

### Examples
**Input:**
```html
<main><div><h1>Shopping</h1><ul><li>Milk</li><li>Eggs</li></ul></div></main>
```

**Output:**
- Block 1: heading level 1, "Shopping"
- Block 2: paragraph, "• Milk"
- Block 3: paragraph, "• Eggs"

### Architecture
- Containers (article, section, main, div): Recurse into children
- Headings (h1-h6): Create heading blocks
- Lists (ul, ol): Track context for numbering
- List items (li): Create blocks with • or number prefix
- Content (p, blockquote, pre): Create paragraph blocks
- Lists within lists: Nested context stack maintains proper numbering
