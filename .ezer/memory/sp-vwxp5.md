---
type: note
created: '2026-01-17T14:36:27.512Z'
---
## Key Issues Fixed

### 1. Missing Type Definitions
- Added @types/react and @types/react-dom for React 19.2.3
- Required for proper TypeScript type support

### 2. DOM Library Configuration  
- Updated tsconfig.json to include DOM lib (extends @tsconfig/bun)
- Provides types for window, document, HTMLElement, ClipboardEvent, etc.

### 3. Type-Only Import with verbatimModuleSyntax
- Changed `import { TimingConfig }` to `import type { TimingConfig }`
- Required when verbatimModuleSyntax is enabled

### 4. Array Access Type Safety
- Added undefined checks (not falsy checks !) to allow empty strings
- Applied to array element access in loops with correct bounds
- Pattern: `if (element === undefined) throw new Error(...)`

### 5. Test Assertions with .map()
- Used .map() pattern for cleaner test assertions
- Example: `expect(slides.map(s => s.word)).toEqual([...])`
- Much cleaner than individual [i] access

### 6. Event Type Compatibility
- Added symbol key index signature to PlayerEvents interface
- Pattern: `[key: symbol]: unknown` alongside string signature

## Results
- All 212 tests pass with >98% coverage
- Fixed ~260+ type errors across source and tests
