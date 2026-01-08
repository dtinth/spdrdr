import { TimingConfig } from "./config";

export interface DurationContext {
  /** Is this the last word in a block? */
  isBlockEnd: boolean;

  /** Is this a heading block? */
  isHeading: boolean;
}

/**
 * Multipliers for duration calculation
 */
export interface DurationMultipliers {
  /** Punctuation multiplier (sentence-end, clause-break, or 1.0) */
  punctuationMult: number;

  /** Structure multiplier (block-end, heading, or 1.0) */
  structureMult: number;

  /** Word length multiplier (short, long, or 1.0) */
  lengthMult: number;

  /** Length factor contribution (based on word length) */
  lengthFactorContribution: number;
}

/**
 * Determine which multipliers apply to a word
 *
 * Returns multipliers by category (using largest per category):
 * - Punctuation: sentence-end, clause-break, or 1.0
 * - Structure: block-end, heading, or 1.0
 * - Word length: short, long, or 1.0
 * - Length factor: sqrt(length) * lengthFactor
 */
export function calculateMultipliers(
  word: string,
  config: TimingConfig,
  context: DurationContext
): DurationMultipliers {
  // Punctuation category (largest wins)
  let punctuationMult = 1.0;
  if (word.endsWith(".") || word.endsWith("!") || word.endsWith("?")) {
    punctuationMult = config.sentenceEndMultiplier;
  } else if (
    word.endsWith(",") ||
    word.endsWith(";") ||
    word.endsWith(":") ||
    word.endsWith("-")
  ) {
    punctuationMult = config.clauseBreakMultiplier;
  }

  // Structure category (largest wins)
  let structureMult = 1.0;
  if (context.isBlockEnd) {
    structureMult = Math.max(
      structureMult,
      config.paragraphEndMultiplier
    );
  }
  if (context.isHeading) {
    structureMult = Math.max(structureMult, config.headingMultiplier);
  }

  // Word length category (largest wins)
  let lengthMult = 1.0;
  const wordLen = word.length;
  if (wordLen >= 1 && wordLen <= 4) {
    lengthMult = config.shortWordMultiplier;
  } else if (wordLen >= 9) {
    lengthMult = config.longWordMultiplier;
  }

  // Length factor contribution
  const lengthFactorContribution = Math.sqrt(wordLen) * config.lengthFactor;

  return {
    punctuationMult,
    structureMult,
    lengthMult,
    lengthFactorContribution,
  };
}

/**
 * Calculate display duration in milliseconds for a word
 *
 * Algorithm:
 * 1. Base duration = 60000 / wpm
 * 2. Get multipliers from calculateMultipliers()
 * 3. Apply combined multiplier: baseDuration × punctMult × structMult × lengthMult
 * 4. Add length factor: + lengthFactorContribution * baseDuration
 */
export function calculateDuration(
  word: string,
  config: TimingConfig,
  context: DurationContext
): number {
  const baseDuration = 60000 / config.wpm;
  const multipliers = calculateMultipliers(word, config, context);

  // Apply combined multiplier
  let duration =
    baseDuration * multipliers.punctuationMult * multipliers.structureMult * multipliers.lengthMult;

  // Add length factor
  duration += multipliers.lengthFactorContribution * baseDuration;

  return duration;
}
