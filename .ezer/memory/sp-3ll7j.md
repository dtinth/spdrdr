---
type: note
created: '2026-01-18T08:43:17.415Z'
---
## HTML Parser - Text Node Handling Refactor

### Problem & Solution
Initially attempted a complex block-level depth tracking algorithm to handle text nodes outside block elements. This proved overcomplicated and caused test failures due to structural changes.

**Key Learning**: The simplest solution was best - just add text node handling before the element-only check.

### Implementation
Added minimal 11-line text node handler at the start of processNodes loop:
- Check if node.type === 'text'
- Normalize and emit as paragraph block
- Preserve all existing functionality

### Critical Insight
When refactoring, I made the mistake of trying to rewrite large sections at once (using currentBlock object tracking). This created multiple issues:
1. Changed how containers were handled
2. Broke heading detection 
3. Made text accumulation complex

**Solution**: Reverted to original code, made ONE small surgical change to handle text nodes.

### Result
- All 39 tests pass (36 existing + 3 new)
- Text outside elements now correctly creates separate blocks:
  - `<p>hello</p>world` → 2 blocks
  - `before<p>inside</p>` → 2 blocks
  - `<p>first</p>between<p>second</p>` → 3 blocks

### Lesson for Future Sessions
When implementing a plan, always start with the simplest possible change first. If a complex refactoring is needed, it should be broken down into smaller, testable increments rather than rewriting entire functions at once.
