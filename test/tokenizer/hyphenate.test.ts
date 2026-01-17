import { describe, expect, it } from "bun:test";
import { hyphenate } from "../../src/tokenizer/hyphenate";

describe("hyphenate", () => {
  it("returns single fragment for short words", () => {
    const result = hyphenate("hello");
    expect(result).toEqual(["hello"]);
  });

  it("returns single fragment for words at max length", () => {
    // "understanding" is exactly 13 chars
    const result = hyphenate("understanding", 13);
    expect(result.length).toBe(1);
    expect(result[0]!).toBe("understanding");
  });

  it("respects custom maxWordLength", () => {
    // "unbelievable" is 12 chars, so with maxWordLength 12 should not split
    const result1 = hyphenate("unbelievable", 12);
    expect(result1.length).toBe(1);

    // But with maxWordLength 11, should split
    const result2 = hyphenate("unbelievable", 11);
    expect(result2.length).toBeGreaterThan(1);
  });

  it("splits long words", () => {
    const result = hyphenate("internationalization");
    expect(result.length).toBeGreaterThan(1);
  });

  it("adds hyphens to non-final fragments", () => {
    const result = hyphenate("internationalization");
    for (let i = 0; i < result.length - 1; i++) {
      expect(result[i]!).toMatch(/-$/);
    }
  });

  it("does not add hyphen to final fragment", () => {
    const result = hyphenate("internationalization");
    expect(result[result.length - 1]!).not.toMatch(/-$/);
  });

  it("reconstructs word from fragments", () => {
    const word = "internationalization";
    const result = hyphenate(word);
    const reconstructed = result.join("").replace(/-/g, "");
    expect(reconstructed).toBe(word);
  });

  it("handles words with multiple possible splits", () => {
    const result = hyphenate("antidisestablishmentarianism");
    expect(result.length).toBeGreaterThan(1);
    const reconstructed = result.join("").replace(/-/g, "");
    expect(reconstructed).toBe("antidisestablishmentarianism");
  });
});
