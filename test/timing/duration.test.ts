import { describe, expect, it } from "bun:test";
import { calculateDuration, calculateMultipliers, type DurationContext } from "../../src/timing/duration";
import { DEFAULT_TIMING_CONFIG } from "../../src/timing/config";

describe("calculateMultipliers", () => {
  const baseContext: DurationContext = {
    isBlockEnd: false,
    isHeading: false,
  };

  describe("punctuation multipliers", () => {
    it("returns 1.0 for words without punctuation", () => {
      const m = calculateMultipliers("word", DEFAULT_TIMING_CONFIG, baseContext);
      expect(m.punctuationMult).toBe(1.0);
    });

    it("returns sentenceEndMultiplier for period", () => {
      const m = calculateMultipliers("word.", DEFAULT_TIMING_CONFIG, baseContext);
      expect(m.punctuationMult).toBe(DEFAULT_TIMING_CONFIG.sentenceEndMultiplier);
    });

    it("returns sentenceEndMultiplier for exclamation", () => {
      const m = calculateMultipliers("word!", DEFAULT_TIMING_CONFIG, baseContext);
      expect(m.punctuationMult).toBe(DEFAULT_TIMING_CONFIG.sentenceEndMultiplier);
    });

    it("returns sentenceEndMultiplier for question mark", () => {
      const m = calculateMultipliers("word?", DEFAULT_TIMING_CONFIG, baseContext);
      expect(m.punctuationMult).toBe(DEFAULT_TIMING_CONFIG.sentenceEndMultiplier);
    });

    it("returns clauseBreakMultiplier for comma", () => {
      const m = calculateMultipliers("word,", DEFAULT_TIMING_CONFIG, baseContext);
      expect(m.punctuationMult).toBe(DEFAULT_TIMING_CONFIG.clauseBreakMultiplier);
    });

    it("returns clauseBreakMultiplier for semicolon", () => {
      const m = calculateMultipliers("word;", DEFAULT_TIMING_CONFIG, baseContext);
      expect(m.punctuationMult).toBe(DEFAULT_TIMING_CONFIG.clauseBreakMultiplier);
    });

    it("returns clauseBreakMultiplier for colon", () => {
      const m = calculateMultipliers("word:", DEFAULT_TIMING_CONFIG, baseContext);
      expect(m.punctuationMult).toBe(DEFAULT_TIMING_CONFIG.clauseBreakMultiplier);
    });

    it("returns clauseBreakMultiplier for hyphen", () => {
      const m = calculateMultipliers("word-", DEFAULT_TIMING_CONFIG, baseContext);
      expect(m.punctuationMult).toBe(DEFAULT_TIMING_CONFIG.clauseBreakMultiplier);
    });
  });

  describe("structure multipliers", () => {
    it("returns 1.0 for regular words", () => {
      const m = calculateMultipliers("word", DEFAULT_TIMING_CONFIG, baseContext);
      expect(m.structureMult).toBe(1.0);
    });

    it("returns paragraphEndMultiplier at block end", () => {
      const m = calculateMultipliers("word", DEFAULT_TIMING_CONFIG, {
        isBlockEnd: true,
        isHeading: false,
      });
      expect(m.structureMult).toBe(DEFAULT_TIMING_CONFIG.paragraphEndMultiplier);
    });

    it("returns headingMultiplier in heading", () => {
      const m = calculateMultipliers("word", DEFAULT_TIMING_CONFIG, {
        isBlockEnd: false,
        isHeading: true,
      });
      expect(m.structureMult).toBe(DEFAULT_TIMING_CONFIG.headingMultiplier);
    });

    it("uses max when both block end and heading", () => {
      const m = calculateMultipliers("word", DEFAULT_TIMING_CONFIG, {
        isBlockEnd: true,
        isHeading: true,
      });
      const expected = Math.max(
        DEFAULT_TIMING_CONFIG.paragraphEndMultiplier,
        DEFAULT_TIMING_CONFIG.headingMultiplier
      );
      expect(m.structureMult).toBe(expected);
    });
  });

  describe("length multipliers", () => {
    it("returns 1.0 for medium words (5-8 chars)", () => {
      const m = calculateMultipliers("hello", DEFAULT_TIMING_CONFIG, baseContext);
      expect(m.lengthMult).toBe(1.0);
    });

    it("returns shortWordMultiplier for 1-4 char words", () => {
      const m = calculateMultipliers("hi", DEFAULT_TIMING_CONFIG, baseContext);
      expect(m.lengthMult).toBe(DEFAULT_TIMING_CONFIG.shortWordMultiplier);
    });

    it("returns longWordMultiplier for 9+ char words", () => {
      const m = calculateMultipliers("wonderful", DEFAULT_TIMING_CONFIG, baseContext);
      expect(m.lengthMult).toBe(DEFAULT_TIMING_CONFIG.longWordMultiplier);
    });

    it("applies to word length without punctuation", () => {
      // "hi." is 3 chars total, but should still get short multiplier
      const m = calculateMultipliers("hi.", DEFAULT_TIMING_CONFIG, baseContext);
      expect(m.lengthMult).toBe(DEFAULT_TIMING_CONFIG.shortWordMultiplier);
    });
  });

  describe("length factor", () => {
    it("calculates lengthFactorContribution based on sqrt(length)", () => {
      const m = calculateMultipliers("hello", DEFAULT_TIMING_CONFIG, baseContext);
      const expected = Math.sqrt(5) * DEFAULT_TIMING_CONFIG.lengthFactor;
      expect(m.lengthFactorContribution).toBeCloseTo(expected, 10);
    });
  });
});

describe("calculateDuration", () => {
  const baseContext: DurationContext = {
    isBlockEnd: false,
    isHeading: false,
  };

  it("calculates base duration from WPM", () => {
    // At 300 WPM: 60000 / 300 = 200ms
    const baseDuration = 60000 / DEFAULT_TIMING_CONFIG.wpm;
    const duration = calculateDuration("hello", DEFAULT_TIMING_CONFIG, baseContext);
    // Should include length factor
    expect(duration).toBeGreaterThan(baseDuration);
  });

  it("combines multipliers correctly", () => {
    const duration = calculateDuration("hi.", DEFAULT_TIMING_CONFIG, {
      isBlockEnd: true,
      isHeading: false,
    });

    const multipliers = calculateMultipliers("hi.", DEFAULT_TIMING_CONFIG, {
      isBlockEnd: true,
      isHeading: false,
    });

    const baseDuration = 60000 / DEFAULT_TIMING_CONFIG.wpm;
    const expected =
      baseDuration *
        multipliers.punctuationMult *
        multipliers.structureMult *
        multipliers.lengthMult +
      multipliers.lengthFactorContribution * baseDuration;

    expect(duration).toBeCloseTo(expected, 5);
  });

  it("applies all three multiplier categories at once", () => {
    // "hi." with block end context:
    // - Punctuation: 2.5 (sentence end)
    // - Structure: 2.5 (block end)
    // - Length: 1.3 (short word)
    const duration = calculateDuration("hi.", DEFAULT_TIMING_CONFIG, {
      isBlockEnd: true,
      isHeading: false,
    });

    const baseDuration = 60000 / DEFAULT_TIMING_CONFIG.wpm;
    // At minimum: 2.5 * 2.5 * 1.3 = 8.125x multiplier
    expect(duration / baseDuration).toBeGreaterThan(8);
  });
});
