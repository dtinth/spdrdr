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

  /** Number of words at start that get slow-start treatment */
  slowStartCount: number;

  /** Initial multiplier for slow start (decays to 1.0) */
  slowStartMultiplier: number;
}

export const DEFAULT_TIMING_CONFIG: TimingConfig = {
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
