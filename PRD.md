# spdrdr - Speed Reader Library & Application

## Overview

**spdrdr** is an RSVP (Rapid Serial Visual Presentation) speed reading library and web application. It displays text one word at a time at a fixed focal point, enabling faster reading by eliminating eye movement.

### Goals

1. **Library-first**: Core logic is a pure TypeScript library with no UI dependencies
2. **Well-tested**: Comprehensive unit tests using Bun's test runner
3. **Embeddable**: Can be embedded in other applications via PostMessage API
4. **Offline-capable**: Works as a standalone PWA
5. **Modern stack**: Bun, strict TypeScript, modern ES modules

---

## Tech Stack

- **Runtime**: Bun
- **Language**: TypeScript (strict mode)
- **Testing**: Bun's built-in test runner
- **Package**: Single npm package `spdrdr`
- **App**: Separate web application built on top of the library

---

## Data Model

### Block

A semantic unit of content (heading or paragraph).

```typescript
interface Block {
  /** Internal unique ID (simple incrementing: "1", "2", "3"...) */
  id: string;
  
  /** Optional reference ID from external controller/source */
  externalId?: string;
  
  /** Block type */
  type: 'heading' | 'paragraph';
  
  /** Heading level 1-6 (only for type: 'heading') */
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  
  /** Plain text content (no rich text/formatting) */
  text: string;
}
```

### Document

Top-level container for parsed content.

```typescript
interface Document {
  blocks: Block[];
  metadata?: {
    title?: string;
    source?: string;
  };
}
```

### Slide

A single display frame representing one word.

```typescript
interface Slide {
  /** The word to display */
  word: string;
  
  /** ORP (Optimal Recognition Point) position, 0-indexed */
  pivotIndex: number;
  
  /** Calculated display duration in milliseconds */
  duration: number;
  
  /** Reference to parent block */
  blockId: string;
  
  /** Word position within the block (0-indexed) */
  wordIndex: number;
  
  /** Whether this is the last word in its block */
  isBlockEnd: boolean;
  
  /** Whether this is the last word in the document */
  isDocumentEnd: boolean;
}
```

### TimingConfig

Configuration for duration calculations.

```typescript
interface TimingConfig {
  /** Base reading speed in words per minute */
  wpm: number;
  
  /** Multiplier after sentence-ending punctuation (. ! ?) */
  sentenceEndMultiplier: number;
  
  /** Multiplier after clause-break punctuation (, ; : -) */
  clauseBreakMultiplier: number;
  
  /** Multiplier at end of paragraph/block */
  paragraphEndMultiplier: number;
  
  /** Multiplier for short words (1-4 characters) */
  shortWordMultiplier: number;
  
  /** Multiplier for long words (9+ characters) */
  longWordMultiplier: number;
  
  /** Multiplier for heading blocks (slower for comprehension) */
  headingMultiplier: number;
  
  /**
   * Length factor for word-length-based duration adjustment
   * Formula: duration += sqrt(wordLength) * lengthFactor * baseDuration
   */
  lengthFactor: number;
  
  /** Number of words at start that get slow-start treatment */
  slowStartCount: number;
  
  /** Initial multiplier for slow start (decays to 1.0) */
  slowStartMultiplier: number;
}
```

Default configuration:

```typescript
const DEFAULT_TIMING_CONFIG: TimingConfig = {
  wpm: 300,
  sentenceEndMultiplier: 2.5,
  clauseBreakMultiplier: 1.5,
  paragraphEndMultiplier: 2.5,
  shortWordMultiplier: 1.3,
  longWordMultiplier: 1.4,
  headingMultiplier: 1.5,
  lengthFactor: 0.04,
  slowStartCount: 5,
  slowStartMultiplier: 2.0,
};
```

---

## Project Structure

```
spdrdr/
├── src/                         # Library source (published to npm)
│   ├── index.ts                 # Main library exports
│   ├── types.ts                 # All TypeScript interfaces
│   │
│   ├── parser/
│   │   ├── index.ts             # Parser exports & auto-detect
│   │   ├── plaintext.ts         # Plain text → Document
│   │   ├── markdown.ts          # Markdown → Document
│   │   └── html.ts              # HTML → Document
│   │
│   ├── tokenizer/
│   │   ├── index.ts             # Tokenizer exports
│   │   ├── tokenize.ts          # Text → words array
│   │   └── hyphenate.ts         # Long word breaking
│   │
│   ├── timing/
│   │   ├── index.ts             # Timing exports
│   │   ├── orp.ts               # ORP (pivot) calculation
│   │   ├── duration.ts          # Duration calculation
│   │   └── config.ts            # Default config & presets
│   │
│   └── compiler/
│       ├── index.ts             # Compiler exports
│       └── compile.ts           # Document → Slide[]
│
├── app/                         # Web application (not published to npm)
│   ├── index.html
│   ├── main.ts
│   ├── player.ts                # Playback engine with UI bindings
│   ├── components/
│   │   ├── Reader.ts            # Main reader display
│   │   ├── Controls.ts          # Play/pause, speed, progress
│   │   └── Settings.ts          # Configuration panel
│   ├── styles/
│   │   └── main.css
│   └── lib/
│       └── postmessage.ts       # PostMessage API handler
│
├── test/
│   ├── parser/
│   │   ├── plaintext.test.ts
│   │   ├── markdown.test.ts
│   │   └── html.test.ts
│   │
│   ├── tokenizer/
│   │   ├── tokenize.test.ts
│   │   └── hyphenate.test.ts
│   │
│   ├── timing/
│   │   ├── orp.test.ts
│   │   └── duration.test.ts
│   │
│   └── compiler/
│       └── compile.test.ts
│
├── package.json
├── tsconfig.json
├── tsconfig.app.json            # Extends base, for app build
├── bunfig.toml
└── README.md
```

---

## Module Specifications

### Parser Module

#### `parse(input: string, format?: 'auto' | 'plain' | 'markdown' | 'html'): Document`

Main entry point. Auto-detects format if not specified.

#### `parsePlainText(input: string): Document`

Converts plain text to Document:
- Splits on double newlines (`\n\n`) into paragraphs
- Each paragraph becomes a Block with `type: 'paragraph'`
- Trims whitespace, collapses multiple spaces

```typescript
// Example
parsePlainText("First paragraph.\n\nSecond paragraph.")
// → { blocks: [
//     { id: "1", type: "paragraph", text: "First paragraph." },
//     { id: "2", type: "paragraph", text: "Second paragraph." }
//   ]}
```

#### `parseMarkdown(input: string): Document`

Converts Markdown to Document:
- Extracts headings (`#`, `##`, etc.) with correct levels
- Paragraphs become paragraph blocks
- **Strips all formatting** (bold, italic, links, code) → plain text
- Ignores code blocks, images, horizontal rules

```typescript
// Example
parseMarkdown("# Title\n\nSome **bold** text.\n\n## Section")
// → { blocks: [
//     { id: "1", type: "heading", level: 1, text: "Title" },
//     { id: "2", type: "paragraph", text: "Some bold text." },
//     { id: "3", type: "heading", level: 2, text: "Section" }
//   ]}
```

#### `parseHtml(input: string): Document`

Converts HTML to Document:
- Extracts `<h1>`-`<h6>` as headings
- Extracts `<p>` as paragraphs
- Strips all tags → plain text
- Decodes HTML entities

---

### Tokenizer Module

#### `tokenize(text: string, options?: TokenizeOptions): string[]`

Splits text into words.

```typescript
interface TokenizeOptions {
  /** Maximum word length before hyphenation (default: 13) */
  maxWordLength?: number;
  
  /** Custom hyphenation function (for swappable implementation) */
  hyphenator?: (word: string) => string[];
}
```

Rules:
- Split on whitespace
- Preserve punctuation attached to words (e.g., `"hello,"` stays as one token)
- Apply hyphenation to words exceeding `maxWordLength`

```typescript
// Examples
tokenize("Hello, world!")
// → ["Hello,", "world!"]

tokenize("This is internationalization.")
// → ["This", "is", "inter-", "nation-", "altic", "ation."]
```

#### `hyphenate(word: string): string[]`

Default hyphenation implementation (simple, swappable).

Initial implementation uses syllable heuristics:
1. Check for common prefixes (un-, re-, pre-, anti-, etc.)
2. Check for common suffixes (-ing, -tion, -ment, etc.)
3. Apply VCCV pattern (vowel-consonant-consonant-vowel splits)
4. Fall back to fixed-interval splitting

**Interface contract**: Takes a single word, returns array of fragments. Last fragment should NOT have trailing hyphen if it's the end.

```typescript
// Example
hyphenate("internationalization")
// → ["inter-", "nation-", "alization"]

hyphenate("reading")  // Short enough, no split needed
// → ["reading"]
```

---

### Timing Module

#### `calculateORP(word: string): number`

Returns the 0-indexed position of the Optimal Recognition Point.

Algorithm (based on research):
| Word Length | ORP Index |
|-------------|-----------|
| 1           | 0         |
| 2-4         | 1         |
| 5-8         | 2         |
| 9-13        | 3         |
| 14+         | 4         |

Adjustments:
- If word starts with quote/parenthesis (`"`, `'`, `(`), increment ORP by 1

```typescript
// Examples
calculateORP("a")        // → 0
calculateORP("to")       // → 1
calculateORP("word")     // → 1
calculateORP("reading")  // → 2
calculateORP('"Hello')   // → 2 (adjusted for leading quote)
```

#### `calculateDuration(word: string, config: TimingConfig, context: DurationContext): number`

Calculates display duration in milliseconds.

```typescript
interface DurationContext {
  /** Is this the last word in a block? */
  isBlockEnd: boolean;
  
  /** Is this a heading block? */
  isHeading: boolean;
  
  /** Position in slow-start sequence (0 = not in slow start) */
  slowStartPosition: number;
}
```

Algorithm:
1. Base duration = `60000 / wpm`
2. Collect applicable multipliers into categories, take the **largest** from each category:
   - **Punctuation category** (largest wins):
     - If ends with `.`, `!`, `?`: `sentenceEndMultiplier`
     - Else if ends with `,`, `;`, `:`, `-`: `clauseBreakMultiplier`
     - Else: `1.0`
   - **Structure category** (largest wins):
     - If `isBlockEnd`: `paragraphEndMultiplier`
     - If `isHeading`: `headingMultiplier`
     - Else: `1.0`
   - **Word length category** (largest wins):
     - If word length 1-4: `shortWordMultiplier`
     - If word length 9+: `longWordMultiplier`
     - Else: `1.0`
3. Apply combined multiplier: `baseDuration × punctuationMult × structureMult × lengthMult`
4. Add length factor: `+ sqrt(length) * lengthFactor * baseDuration`
5. Apply slow start (if applicable): `× (1 + (slowStartMultiplier - 1) * (slowStartPosition / slowStartCount))`

Note: Within each category, only the largest multiplier applies. Categories multiply together.

---

### Compiler Module

#### `compile(document: Document, config: TimingConfig): Slide[]`

Converts a Document into an array of Slides ready for playback.

```typescript
// Example
const doc = parsePlainText("Hello world. Goodbye.");
const slides = compile(doc, DEFAULT_TIMING_CONFIG);
// → [
//   { word: "Hello", pivotIndex: 1, duration: 260, blockId: "1", wordIndex: 0, isBlockEnd: false, isDocumentEnd: false },
//   { word: "world.", pivotIndex: 2, duration: 500, blockId: "1", wordIndex: 1, isBlockEnd: false, isDocumentEnd: false },
//   { word: "Goodbye.", pivotIndex: 2, duration: 750, blockId: "1", wordIndex: 2, isBlockEnd: true, isDocumentEnd: true },
// ]
```

---

## Application Layer (Future)

The application layer (not part of the core library) will handle:

### Player Class

```typescript
interface PlayerState {
  status: 'idle' | 'playing' | 'paused' | 'complete';
  currentIndex: number;
}

interface PlayerCallbacks {
  onSlide?: (slide: Slide, index: number) => void;
  onBlockChange?: (blockId: string) => void;
  onStatusChange?: (status: PlayerState['status']) => void;
  onProgress?: (current: number, total: number) => void;
  onComplete?: () => void;
}

class Player {
  constructor(slides: Slide[], callbacks?: PlayerCallbacks);
  
  play(): void;
  pause(): void;
  toggle(): void;
  stop(): void;
  
  seekTo(index: number): void;
  seekToBlock(blockId: string): void;
  
  next(): void;      // Manual advance
  previous(): void;  // Go back one slide
  
  getState(): PlayerState;
}
```

### PostMessage API

For embedding in iframes or communication with parent windows.

```typescript
// Inbound messages (controller → reader)
type InboundMessage =
  | { type: 'load'; content: string; format?: 'plain' | 'markdown' | 'html' }
  | { type: 'loadDocument'; document: Document }
  | { type: 'play' }
  | { type: 'pause' }
  | { type: 'toggle' }
  | { type: 'stop' }
  | { type: 'seekBlock'; blockId: string }
  | { type: 'seekSlide'; index: number }
  | { type: 'setWpm'; wpm: number }
  | { type: 'setConfig'; config: Partial<TimingConfig> };

// Outbound messages (reader → controller)
type OutboundMessage =
  | { type: 'ready' }
  | { type: 'loaded'; blockCount: number; slideCount: number }
  | { type: 'slideChange'; slide: Slide; index: number }
  | { type: 'blockChange'; blockId: string; externalId?: string }
  | { type: 'statusChange'; status: PlayerState['status'] }
  | { type: 'progress'; current: number; total: number; percent: number }
  | { type: 'complete' }
  | { type: 'error'; message: string };
```

### UI Features (App Layer)

- Paste text (Cmd/Ctrl+V)
- Keyboard controls: Space (play/pause), ←/→ (seek), ↑/↓ (WPM)
- WPM slider
- Progress bar with click-to-seek
- Dark/light mode
- Font size adjustment
- Responsive design (mobile-first)
- PWA support (offline)

---

## Testing Strategy

### Unit Test Examples

```typescript
// test/parser/plaintext.test.ts
import { describe, expect, test } from "bun:test";
import { parsePlainText } from "../../src/parser/plaintext";

describe("parsePlainText", () => {
  test("splits on double newlines", () => {
    const result = parsePlainText("First.\n\nSecond.");
    expect(result.blocks).toHaveLength(2);
    expect(result.blocks[0].text).toBe("First.");
    expect(result.blocks[1].text).toBe("Second.");
  });

  test("trims whitespace", () => {
    const result = parsePlainText("  Hello world.  \n\n  Goodbye.  ");
    expect(result.blocks[0].text).toBe("Hello world.");
    expect(result.blocks[1].text).toBe("Goodbye.");
  });

  test("collapses multiple spaces", () => {
    const result = parsePlainText("Hello    world.");
    expect(result.blocks[0].text).toBe("Hello world.");
  });

  test("assigns unique IDs to blocks", () => {
    const result = parsePlainText("A\n\nB\n\nC");
    const ids = result.blocks.map(b => b.id);
    expect(new Set(ids).size).toBe(3); // All unique
  });

  test("sets type to paragraph", () => {
    const result = parsePlainText("Hello.");
    expect(result.blocks[0].type).toBe("paragraph");
  });
});
```

```typescript
// test/timing/orp.test.ts
import { describe, expect, test } from "bun:test";
import { calculateORP } from "../../src/timing/orp";

describe("calculateORP", () => {
  test.each([
    ["a", 0],
    ["I", 0],
    ["to", 1],
    ["the", 1],
    ["word", 1],
    ["speed", 2],
    ["reading", 2],
    ["comprehend", 3],
    ["understanding", 3],
    ["internationalization", 4],
  ])('calculateORP("%s") → %i', (word, expected) => {
    expect(calculateORP(word)).toBe(expected);
  });

  test("adjusts for leading quote", () => {
    expect(calculateORP('"Hello')).toBe(2); // Would be 1, +1 for quote
    expect(calculateORP("'Test")).toBe(2);
    expect(calculateORP("(word")).toBe(2);
  });
});
```

```typescript
// test/compiler/compile.test.ts
import { describe, expect, test } from "bun:test";
import { compile } from "../../src/compiler/compile";
import { parsePlainText } from "../../src/parser/plaintext";
import { DEFAULT_TIMING_CONFIG } from "../../src/timing/config";

describe("compile", () => {
  test("creates slides for each word", () => {
    const doc = parsePlainText("Hello world.");
    const slides = compile(doc, DEFAULT_TIMING_CONFIG);
    
    expect(slides).toHaveLength(2);
    expect(slides[0].word).toBe("Hello");
    expect(slides[1].word).toBe("world.");
  });

  test("marks block end correctly", () => {
    const doc = parsePlainText("First block.\n\nSecond block.");
    const slides = compile(doc, DEFAULT_TIMING_CONFIG);
    
    const blockEnds = slides.filter(s => s.isBlockEnd);
    expect(blockEnds).toHaveLength(2);
  });

  test("marks document end on last slide", () => {
    const doc = parsePlainText("Only sentence.");
    const slides = compile(doc, DEFAULT_TIMING_CONFIG);
    
    expect(slides[slides.length - 1].isDocumentEnd).toBe(true);
    expect(slides[0].isDocumentEnd).toBe(false);
  });

  test("applies longer duration to sentence-ending punctuation", () => {
    const doc = parsePlainText("Hello. World");
    const slides = compile(doc, DEFAULT_TIMING_CONFIG);
    
    // "Hello." has sentence-end multiplier, "World" has none
    expect(slides[0].duration).toBeGreaterThan(slides[1].duration);
  });

  test("uses largest multiplier within structure category", () => {
    // If a word is both at block end AND in a heading,
    // use the larger of paragraphEndMultiplier vs headingMultiplier
    const doc = parseMarkdown("# Title");
    const slides = compile(doc, DEFAULT_TIMING_CONFIG);
    
    // Title is heading (1.5x) AND block end (2.5x)
    // Should use 2.5x (largest in structure category), not 1.5 * 2.5
    const expectedBase = 60000 / DEFAULT_TIMING_CONFIG.wpm;
    const expectedMax = Math.max(
      DEFAULT_TIMING_CONFIG.paragraphEndMultiplier,
      DEFAULT_TIMING_CONFIG.headingMultiplier
    );
    // Duration should reflect largest, not product
    expect(slides[0].duration).toBeLessThan(expectedBase * 1.5 * 2.5 * 1.5); // Not all multiplied
  });
});
```

---

## Project Setup

### package.json

```json
{
  "name": "spdrdr",
  "version": "0.1.0",
  "description": "RSVP speed reading library",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "bun build ./src/index.ts --outdir ./dist --target browser",
    "build:app": "bun build ./app/main.ts --outdir ./public --minify",
    "dev": "bun --watch ./app/main.ts",
    "test": "bun test",
    "test:watch": "bun test --watch",
    "typecheck": "tsc --noEmit",
    "typecheck:app": "tsc --noEmit -p tsconfig.app.json",
    "lint": "biome check .",
    "format": "biome format --write .",
    "prepublishOnly": "bun run build"
  },
  "devDependencies": {
    "@biomejs/biome": "latest",
    "@types/bun": "latest",
    "typescript": "^5"
  }
}
```

Note: The library (`src/`) has **zero runtime dependencies**. All tooling (Biome, TypeScript, Bun types) is in `devDependencies`. The web app (`app/`) may add framework dependencies later, but those would also go in `devDependencies` since the app is built as a static site and not published to npm.

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true,
    "exactOptionalPropertyTypes": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "dist",
    "rootDir": "src",
    "skipLibCheck": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "test", "app"]
}
```

### tsconfig.app.json

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "declaration": false,
    "declarationMap": false,
    "rootDir": ".",
    "outDir": "public"
  },
  "include": ["src/**/*", "app/**/*"],
  "exclude": ["node_modules", "dist", "test"]
}
```

### bunfig.toml

```toml
[test]
coverage = true
coverageDir = "coverage"
```

---

## Implementation Order

### Phase 1: Core Library
1. **Types** (`src/types.ts`) - Define all interfaces
2. **Timing/ORP** (`src/timing/orp.ts`) - Simple, well-defined algorithm
3. **Timing/Config** (`src/timing/config.ts`) - Default configuration
4. **Timing/Duration** (`src/timing/duration.ts`) - Duration calculation
5. **Tokenizer** (`src/tokenizer/`) - Text splitting and hyphenation
6. **Parser/PlainText** (`src/parser/plaintext.ts`) - Simplest parser
7. **Compiler** (`src/compiler/compile.ts`) - Ties it all together
8. **Parser/Markdown** (`src/parser/markdown.ts`) - More complex parser
9. **Parser/HTML** (`src/parser/html.ts`) - Most complex parser
10. **Index** (`src/index.ts`) - Public API exports

Write tests alongside each module before moving to the next.

### Phase 2: Web Application
11. **Player** (`app/player.ts`) - Playback engine with timers
12. **Basic UI** (`app/`) - Minimal viable reader
13. **PostMessage API** (`app/lib/postmessage.ts`) - Embedding support
14. **Polish** - Keyboard shortcuts, settings, PWA manifest

---

## Open Questions / Future Considerations

1. **Hyphenation library**: Could integrate `hyphenopoly` or `hypher` later for better linguistic hyphenation

2. **Internationalization**: Current design assumes English. Future versions might need:
   - Language-specific ORP calculations
   - RTL support
   - Language-specific hyphenation

3. **Accessibility**: Consider ARIA announcements, screen reader compatibility

4. **Analytics**: Track reading speed, completion rates (app layer concern)

5. **Bookmarking**: Save position within documents (app layer concern)