---
type: note
created: '2026-01-17T14:12:21.553Z'
---
## Em-Dash Support Implementation Complete

### What Was Built
Em-dashes (—, --, ---) are now first-class tokens that get their own slides during playback, enabling natural reading pauses.

### Implementation Details
1. **Tokenizer Enhancement**
   - Em-dash detection at start of word parsing
   - Matches: — (Unicode), -- (ASCII), --- (ASCII)
   - Treated as word boundaries
   - Each gets own token with proper position tracking

2. **No Special Timing**
   - Em-dashes use normal word duration
   - Already have visual/temporal separation as own slide
   - Provides natural reading pause without artificial multipliers

3. **Full Integration**
   - Works with plaintext and HTML parsers
   - Works with all app features (document view, reading screen)
   - Tokenizer tests expanded to 23 tests (was 18)
   - All 203 total tests passing

### Usage Examples
- 'some text—wait—some more text' → 8 slides (including 2 em-dashes)
- 'hello -- world' → 3 slides
- 'hello --- world' → 3 slides

### Test Coverage
- Added 5 comprehensive em-dash tests
- Tests cover all formats (—, --, ---)
- Position tracking verified
- Edge cases: consecutive dashes, position accuracy

### Reading Experience
Users can now use em-dashes naturally in their content:
- Mid-sentence interruptions: 'He said—wait, no—never mind'
- Emphasis breaks: 'It was clear—absolutely clear—what happened'
- Automatic pause for comprehension through visual tokenization
