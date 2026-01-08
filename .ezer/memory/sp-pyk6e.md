---
type: note
created: '2026-01-08T12:50:13.032Z'
---
## Time-Based Player Architecture Complete

### What We Built
Completely refactored the Player system from slide-index to time-based positioning with physics-based acceleration curve.

### Core Architecture Decisions

1. **Time-Based Positioning**
   - Player now tracks currentTime (milliseconds) instead of currentIndex
   - Progress events emit { currentTime, totalTime } instead of indices
   - seekToTime() is primary method, seekToSlide() is wrapper
   - Enables smooth, continuous playback tracking

2. **Acceleration Curve Physics**
   - Formula: u=0 (start), v=1 (end), a=1 (acceleration)
   - Duration: 1 second wall-clock = 500ms playback
   - Auto-transitions to linear 1x speed after acceleration
   - Inverse calculation for resuming from pause maintains correct position

3. **Dependency Injection for TimerApi**
   - Player accepts optional timerApi parameter
   - Allows test to inject fake timers without mocking globals
   - Better testability than relying on real requestAnimationFrame
   - Enables fast test execution with jest.useFakeTimers

### Test Optimization Breakthrough
- Initial approach: custom fake timer implementation (slow, complex)
- Discovery: jest.useFakeTimers from 'bun:test' handles Date.now() mocking
- Result: 6+ seconds → 44ms total test suite (157 tests)
- Key insight: Use framework's built-in tools rather than reinventing

### UI/UX Improvements
- Web app defaults to 640 WPM (vs 300 WPM in library) for RSVP
- Time display format (mm:ss) instead of slide count
- Progress bar no longer animates (instant updates)
- ORP character no longer bold (cleaner look)

### Tokenizer Enhancement
- Slash handling: split on '/' but attach to preceding word
- 'setTimeout/setInterval' → ['setTimeout/', 'setInterval']
- Parallels punctuation handling
- Position indices exclude slash for source mapping
- User guidance was correct: slash attachment improves readability

### Key Learnings
1. **Physics-based timing** - Elegant and predictable, clearer than arbitrary easing functions
2. **Just-in-time implementation** - Only added TimerApi when test needed it
3. **User guidance consistency** - User's suggestions (flexbox layout, slash attachment, CSS refinements) consistently led to better designs
4. **Test infrastructure matters** - Switching to fake timers had massive impact on dev experience

### Remaining Considerations
- Block gaps (100ms) provide visual feedback for new paragraphs
- Hyphenation now handles trailing slashes correctly
- Player API is clean and testable
- Full backwards compatibility: can still use seekToSlide() for convenience
