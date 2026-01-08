import { describe, expect, it } from "bun:test";
import { calculateORP } from "../../src/timing/orp";

describe("calculateORP", () => {
  it("returns 0 for single character words", () => {
    expect(calculateORP("a")).toBe(0);
    expect(calculateORP("I")).toBe(0);
  });

  it("returns 1 for 2-4 character words", () => {
    expect(calculateORP("to")).toBe(1);
    expect(calculateORP("the")).toBe(1);
    expect(calculateORP("word")).toBe(1);
  });

  it("returns 2 for 5-8 character words", () => {
    expect(calculateORP("speed")).toBe(2);
    expect(calculateORP("reading")).toBe(2);
  });

  it("returns 3 for 9-13 character words", () => {
    expect(calculateORP("comprehend")).toBe(3);
    expect(calculateORP("understanding")).toBe(3);
  });

  it("returns 4 for 14+ character words", () => {
    expect(calculateORP("internationalization")).toBe(4);
  });

  it("adjusts for leading quote", () => {
    expect(calculateORP('"Hello')).toBe(3); // 6 chars, base 2 + 1 for quote = 3
    expect(calculateORP('"Hi')).toBe(2); // 3 chars, base 1 + 1 for quote = 2
  });

  it("adjusts for leading single quote", () => {
    expect(calculateORP("'Test")).toBe(3); // 5 chars, base 2 + 1 for quote = 3
  });

  it("adjusts for leading parenthesis", () => {
    expect(calculateORP("(word")).toBe(3); // 5 chars, base 2 + 1 for paren = 3
  });

  it("does not exceed word length", () => {
    expect(calculateORP("(a")).toBe(1); // Would be 0 + 1 = 1, capped at word length - 1
    expect(calculateORP('"I')).toBe(1); // Would be 0 + 1 = 1, capped at word length - 1
  });
});
