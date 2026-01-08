---
type: note
created: '2026-01-08T10:29:10.432Z'
---
## Learnings from MVP Implementation

### Design Decisions That Worked Well
1. **Just-in-time types**: Defining types as needed (when used) vs upfront
   - Kept early work focused and prevented over-engineering
   - Types emerged naturally from requirements
   
2. **Separation of concerns**: Split functions by responsibility
   - calculateMultipliers() + calculateDuration() was better than monolithic duration function
   - Makes testing and debugging much clearer
   - User feedback: "split math logic from discerning logic"
   
3. **Library-first, pure functions**: No side effects in src/
   - All modules are testable independently
   - No UI dependencies in core library
   - Easy to use in CLI and web app

4. **Event-driven Player**: Using mitt for type-safe emitters
   - Clean event model
   - Easy to test
   - Decoupled from UI layer

5. **Token position tracking**: Store startIndex/endIndex in tokens
   - Enables mapping back to source text for highlighting
   - Useful for error reporting and source location tracking

### Areas for Improvement
1. **Slow-start complexity**: Moved from library to app layer
   - Right decision: keeps library simple
   - App can use playback rate modulation instead

2. **Terminal display**: Fixed focal point took iteration
   - First attempt: word centered (shifting left/right)
   - Fixed: ORP stays at screen center
   - Lesson: test UX early

3. **CSS theming**: Initially missed dark-mode requirement
   - User corrected: dark-only with CSS variables
   - CSS variables + stylus support gives flexibility
   - Lesson: ask about theme/branding early

4. **Dependency chain**: Initially created monolithic puzzles
   - User guided: break into smaller MVP-focused pieces
   - Player + MVP UI was right granularity

### Technical Debt / Future Work
- Markdown and HTML parsers (sp-y5ena) - not blocking MVP
- PostMessage API for embedding
- Keyboard shortcuts (currently buttons only)
- Settings panel (WPM adjustment, font size, etc)
- PWA support (manifest, service worker)

### Working Effectively with User Feedback
- User often suggests better approaches mid-implementation
- Stop, listen, and pivot quickly when redirected
- Tool suggestions (tapable → mitt, dark mode approach) were always right
- Use ezer to capture decisions when they're made
