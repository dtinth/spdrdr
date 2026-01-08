import { describe, expect, it } from "bun:test";
import { compile } from "../../src/compiler/compile";
import { parsePlainText } from "../../src/parser/plaintext";
import { DEFAULT_TIMING_CONFIG } from "../../src/timing/config";

describe("compile", () => {
  describe("basic compilation", () => {
    it("creates slides for each word", () => {
      const doc = parsePlainText("Hello world.");
      const slides = compile(doc);

      expect(slides).toHaveLength(2);
      expect(slides[0].word).toBe("Hello");
      expect(slides[1].word).toBe("world.");
    });

    it("handles empty document", () => {
      const doc = { blocks: [] };
      const slides = compile(doc);

      expect(slides).toHaveLength(0);
    });

    it("handles single word", () => {
      const doc = parsePlainText("Hello");
      const slides = compile(doc);

      expect(slides).toHaveLength(1);
      expect(slides[0].word).toBe("Hello");
    });
  });

  describe("slide properties", () => {
    it("calculates ORP for each word", () => {
      const doc = parsePlainText("a wonderful reading experience");
      const slides = compile(doc);

      // ORP should be set for each word
      for (const slide of slides) {
        expect(slide.pivotIndex).toBeGreaterThanOrEqual(0);
        expect(slide.pivotIndex).toBeLessThan(slide.word.length);
      }
    });

    it("calculates duration for each word", () => {
      const doc = parsePlainText("Hello world");
      const slides = compile(doc);

      for (const slide of slides) {
        expect(slide.duration).toBeGreaterThan(0);
      }
    });

    it("assigns correct blockId", () => {
      const doc = parsePlainText("First paragraph.\n\nSecond paragraph.");
      const slides = compile(doc);

      // First 2 slides should have blockId "1"
      expect(slides[0].blockId).toBe("1");
      expect(slides[1].blockId).toBe("1");

      // Next slide should have blockId "2"
      expect(slides[2].blockId).toBe("2");
    });

    it("tracks wordIndex within block", () => {
      const doc = parsePlainText("One two three");
      const slides = compile(doc);

      expect(slides[0].wordIndex).toBe(0);
      expect(slides[1].wordIndex).toBe(1);
      expect(slides[2].wordIndex).toBe(2);
    });
  });

  describe("block boundaries", () => {
    it("marks isBlockEnd correctly", () => {
      const doc = parsePlainText("First block.\n\nSecond block.");
      const slides = compile(doc);

      const blockEnds = slides.filter(s => s.isBlockEnd);
      expect(blockEnds).toHaveLength(2);
      expect(blockEnds[0].word).toBe("block.");
      expect(blockEnds[1].word).toBe("block.");
    });

    it("resets wordIndex on block boundary", () => {
      const doc = parsePlainText("One two.\n\nThree four.");
      const slides = compile(doc);

      expect(slides[0].wordIndex).toBe(0);
      expect(slides[1].wordIndex).toBe(1);
      expect(slides[2].wordIndex).toBe(0); // Reset for new block
      expect(slides[3].wordIndex).toBe(1);
    });
  });

  describe("document boundaries", () => {
    it("marks isDocumentEnd on last slide", () => {
      const doc = parsePlainText("Only sentence.");
      const slides = compile(doc);

      expect(slides[slides.length - 1].isDocumentEnd).toBe(true);
      expect(slides[0].isDocumentEnd).toBe(false);
    });

    it("marks multiple blocks with final end", () => {
      const doc = parsePlainText("First.\n\nSecond.\n\nThird.");
      const slides = compile(doc);

      const lastSlide = slides[slides.length - 1];
      expect(lastSlide.isDocumentEnd).toBe(true);
      expect(lastSlide.isBlockEnd).toBe(true);
    });

    it("all non-final slides have isDocumentEnd false", () => {
      const doc = parsePlainText("One two three four five.");
      const slides = compile(doc);

      for (let i = 0; i < slides.length - 1; i++) {
        expect(slides[i].isDocumentEnd).toBe(false);
      }
    });
  });

  describe("timing context", () => {
    it("applies longer duration to last word in block", () => {
      const doc = parsePlainText("First word.\n\nSecond word.");
      const slides = compile(doc);

      // "word." at end of block should get paragraph multiplier
      const firstBlockEnd = slides[1];
      const secondBlockEnd = slides[3];

      expect(firstBlockEnd.isBlockEnd).toBe(true);
      expect(secondBlockEnd.isBlockEnd).toBe(true);

      // Both should have significant duration due to block end
      expect(firstBlockEnd.duration).toBeGreaterThan(100);
      expect(secondBlockEnd.duration).toBeGreaterThan(100);
    });
  });

  describe("custom timing config", () => {
    it("uses custom WPM", () => {
      const doc = parsePlainText("Hello world");
      const slowConfig = { ...DEFAULT_TIMING_CONFIG, wpm: 100 };
      const fastConfig = { ...DEFAULT_TIMING_CONFIG, wpm: 600 };

      const slowSlides = compile(doc, slowConfig);
      const fastSlides = compile(doc, fastConfig);

      // Same words, slower config should have longer durations
      expect(slowSlides[0].duration).toBeGreaterThan(fastSlides[0].duration);
    });

    it("respects custom multipliers", () => {
      const doc = parsePlainText("Hello.");
      const config = {
        ...DEFAULT_TIMING_CONFIG,
        sentenceEndMultiplier: 5.0, // Very high
      };

      const slides = compile(doc, config);
      expect(slides[0].duration).toBeGreaterThan(500); // Should be very long
    });
  });

  describe("integration tests", () => {
    it("compiles realistic document", () => {
      const text = `The quick brown fox jumps.

Over the lazy dog it goes.`;
      const doc = parsePlainText(text);
      const slides = compile(doc);

      expect(slides.length).toBeGreaterThan(0);

      // First slide
      expect(slides[0].word).toBe("The");
      expect(slides[0].blockId).toBe("1");
      expect(slides[0].wordIndex).toBe(0);
      expect(slides[0].isBlockEnd).toBe(false);
      expect(slides[0].isDocumentEnd).toBe(false);

      // Last slide
      const lastSlide = slides[slides.length - 1];
      expect(lastSlide.isBlockEnd).toBe(true);
      expect(lastSlide.isDocumentEnd).toBe(true);
    });

    it("preserves word content through compilation", () => {
      const text = "Alpha, beta; gamma! Delta? Epsilon.";
      const doc = parsePlainText(text);
      const slides = compile(doc);

      const words = slides.map(s => s.word);
      expect(words).toEqual([
        "Alpha,",
        "beta;",
        "gamma!",
        "Delta?",
        "Epsilon.",
      ]);
    });

    it("each slide has valid properties", () => {
      const doc = parsePlainText("This is a comprehensive test.");
      const slides = compile(doc);

      for (const slide of slides) {
        expect(slide.word).toBeTruthy();
        expect(slide.pivotIndex).toBeGreaterThanOrEqual(0);
        expect(slide.duration).toBeGreaterThan(0);
        expect(slide.blockId).toBeTruthy();
        expect(slide.wordIndex).toBeGreaterThanOrEqual(0);
        expect(typeof slide.isBlockEnd).toBe("boolean");
        expect(typeof slide.isDocumentEnd).toBe("boolean");
      }
    });
  });
});
