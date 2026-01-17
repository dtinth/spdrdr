---
type: note
created: '2026-01-17T15:06:42.106Z'
---
## TypeScript Type Error Fixes - Array Access Assertions

### Summary
Fixed 200+ TypeScript type errors in test files related to array access without non-null assertions.

### Issue Pattern
When accessing array elements like `array[index].property`, TypeScript requires non-null assertions when:
- The array type doesn't guarantee the element exists (even in loops or after length checks)
- The element type is a union that includes undefined

### Solution Applied
Added non-null assertions (!) after array indices:
- `array[0].property` becomes `array[0]!.property`
- `items[i].word` becomes `items[i]!.word`
- Used double cast `(value as unknown as TargetType)` for strict type conversions

### Files Fixed
- test/compiler/compile.test.ts: ~15 assertions
- test/parser/html.test.ts: Array index accesses for blocks, listItems, numberedItems
- test/parser/plaintext.test.ts: Array index accesses for blocks
- test/tokenizer/tokenize.test.ts: Token array accesses
- test/tokenizer/hyphenate.test.ts: Result array accesses
- test/player.test.ts: Added startIndex/endIndex to mock slides
- test/timing/acceleration.test.ts: Positions array access

### Key Insights
1. Array element access needs ! even when logically safe (after length checks)
2. When casting nullable types, use double cast for TypeScript satisfaction
3. Test mock objects must include ALL required properties from interface
4. Bun test framework works well with strict TypeScript configuration

### Results
- All 212 tests pass with >98% coverage
- TypeScript strict mode fully satisfied
- Zero type errors remaining
