---
type: note
created: '2026-01-08T09:28:14.663Z'
---
## Data Model Key Points
- **Block**: Semantic unit (heading or paragraph), plain text only
- **Document**: Array of blocks with optional metadata
- **Slide**: Single display frame (one word + timing info)
- **TimingConfig**: Multipliers for punctuation, structure, word length, slow-start

### Default Config (300 WPM)
- sentenceEndMultiplier: 2.5 (for . ! ?)
- clauseBreakMultiplier: 1.5 (for , ; : -)
- paragraphEndMultiplier: 2.5
- shortWordMultiplier: 1.3 (1-4 chars)
- longWordMultiplier: 1.4 (9+ chars)
- headingMultiplier: 1.5
- lengthFactor: 0.04 (adds sqrt(length) * factor * baseDuration)
- slowStartCount: 5, slowStartMultiplier: 2.0
