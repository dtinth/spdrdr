---
type: note
created: '2026-01-08T09:44:40.260Z'
---
## Timing Module Architecture

### Exports from src/timing/
- `TimingConfig` interface - All timing parameters
- `DEFAULT_TIMING_CONFIG` - 300 WPM base with tuned multipliers
- `DurationContext` - Input context (isBlockEnd, isHeading)
- `DurationMultipliers` - Output of discernment function
- `calculateORP(word)` - Returns pivot index (0-4 with adjustments)
- `calculateMultipliers(word, config, context)` - Returns multiplier object
- `calculateDuration(word, config, context)` - Returns milliseconds (uses calculateMultipliers internally)

### Test Coverage
- ORP: 9 tests (100% - covers all length ranges, leading punctuation edge cases)
- Duration: 20 tests split into:
  - calculateMultipliers: 16 tests (punctuation, structure, length, length factor)
  - calculateDuration: 4 tests (integration tests)
