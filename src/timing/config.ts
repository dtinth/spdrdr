export interface TimingConfig {
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

  /**
   * Gap between blocks in milliseconds
   * During this gap, no slide is displayed (blank screen)
   * Provides visual feedback that a new block has started
   */
  blockGap: number;
}

export const DEFAULT_TIMING_CONFIG: TimingConfig = {
  wpm: 300,
  sentenceEndMultiplier: 2.5,
  clauseBreakMultiplier: 2.0,
  paragraphEndMultiplier: 2.5,
  shortWordMultiplier: 1.3,
  longWordMultiplier: 1.4,
  headingMultiplier: 1.5,
  lengthFactor: 0.04,
  blockGap: 100, // 0.1 second
};
