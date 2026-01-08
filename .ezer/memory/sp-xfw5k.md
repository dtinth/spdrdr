---
type: note
created: '2026-01-08T09:28:14.604Z'
---
## spdrdr Architecture Overview
RSVP speed reading library with library-first design.

### Core Principles
- Pure TypeScript library (zero runtime dependencies)
- Library exports to npm, app is separate PWA
- All parsing/tokenization/timing logic must be testable independently
- Library focuses on: parse → tokenize → calculate timing → compile slides

### Tech Stack
- Runtime: Bun
- Language: TypeScript (strict mode)
- Testing: Bun's test runner
- Package: Single npm package named 'spdrdr'
- App: Built separately on top of library
