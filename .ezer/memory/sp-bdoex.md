---
type: note
created: '2026-01-08T10:23:07.737Z'
---
## Player Class Implementation Complete

### Architecture
- Event-driven with mitt for type-safe event emitters
- Manages playback state and timing
- Supports play, pause, toggle, stop, seek operations
- Block change tracking for document structure awareness

### Events (PlayerEvents)
- `slide`: Emitted before displaying each word { slide, index }
- `blockChange`: When moving to new block { blockId }
- `statusChange`: When status changes { status }
- `progress`: Current playback position { current, total }
- `complete`: When reaching end of document

### Key Features
- State management (idle, playing, paused, complete)
- Automatic progression with timing from slides
- Seek with pause/resume state preservation
- Block-aware seeking
- Debounced block change events (no duplicates)

### Tests: 27 tests, 100% coverage
- Initialization and state
- Play/pause/toggle control
- Seeking (to index, to block, clamping)
- Block change tracking
- Completion detection
- Edge cases (empty slides, single slide)
- Multiple event listeners

