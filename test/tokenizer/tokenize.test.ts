import { describe, expect, it } from "bun:test";
import { tokenize, type Token } from "../../src/tokenizer/tokenize";

describe("tokenize", () => {
  describe("basic tokenization", () => {
    it("splits on whitespace", () => {
      const tokens = tokenize("Hello world");
      expect(tokens).toHaveLength(2);
      expect(tokens[0].word).toBe("Hello");
      expect(tokens[1].word).toBe("world");
    });

    it("handles multiple spaces", () => {
      const tokens = tokenize("Hello  world");
      expect(tokens).toHaveLength(2);
      expect(tokens[0].word).toBe("Hello");
      expect(tokens[1].word).toBe("world");
    });

    it("handles leading and trailing whitespace", () => {
      const tokens = tokenize("  Hello world  ");
      expect(tokens).toHaveLength(2);
      expect(tokens[0].word).toBe("Hello");
      expect(tokens[1].word).toBe("world");
    });

    it("preserves punctuation with words", () => {
      const tokens = tokenize("Hello, world!");
      expect(tokens).toHaveLength(2);
      expect(tokens[0].word).toBe("Hello,");
      expect(tokens[1].word).toBe("world!");
    });
  });

  describe("position tracking", () => {
    it("tracks startIndex and endIndex correctly", () => {
      const text = "Hello world";
      const tokens = tokenize(text);

      // "Hello" is at index 0-5
      expect(tokens[0].startIndex).toBe(0);
      expect(tokens[0].endIndex).toBe(5);
      expect(text.slice(tokens[0].startIndex, tokens[0].endIndex)).toBe("Hello");

      // "world" is at index 6-11
      expect(tokens[1].startIndex).toBe(6);
      expect(tokens[1].endIndex).toBe(11);
      expect(text.slice(tokens[1].startIndex, tokens[1].endIndex)).toBe("world");
    });

    it("tracks positions with punctuation", () => {
      const text = "Hello, world!";
      const tokens = tokenize(text);

      expect(tokens[0].startIndex).toBe(0);
      expect(tokens[0].endIndex).toBe(6);
      expect(text.slice(tokens[0].startIndex, tokens[0].endIndex)).toBe("Hello,");

      expect(tokens[1].startIndex).toBe(7);
      expect(tokens[1].endIndex).toBe(13);
      expect(text.slice(tokens[1].startIndex, tokens[1].endIndex)).toBe("world!");
    });

    it("verifies all tokens map back to original text", () => {
      const text = "The quick brown fox jumps";
      const tokens = tokenize(text);

      for (const token of tokens) {
        const mapped = text.slice(token.startIndex, token.endIndex);
        // For hyphenated words, word includes hyphen but indices don't
        const wordWithoutHyphen = token.word.replace(/-$/, "");
        expect(mapped).toBe(wordWithoutHyphen);
      }
    });
  });

  describe("hyphenation", () => {
    it("hyphenates words longer than maxWordLength", () => {
      // "internationalization" is 20 chars, default maxWordLength is 13
      const tokens = tokenize("internationalization");

      // Should be split into multiple tokens
      expect(tokens.length).toBeGreaterThan(1);

      // Each token should end with hyphen except last
      for (let i = 0; i < tokens.length - 1; i++) {
        expect(tokens[i].word).toMatch(/-$/);
      }

      // Last token should not have hyphen
      expect(tokens[tokens.length - 1].word).not.toMatch(/-$/);
    });

    it("respects custom maxWordLength", () => {
      // With maxWordLength: 5, "Hello" (5 chars) should not be split
      const tokens1 = tokenize("Hello", { maxWordLength: 5 });
      expect(tokens1).toHaveLength(1);
      expect(tokens1[0].word).toBe("Hello");

      // With maxWordLength: 4, "Hello" should be split
      const tokens2 = tokenize("Hello", { maxWordLength: 4 });
      expect(tokens2.length).toBeGreaterThan(1);
    });

    it("preserves position tracking through hyphenation", () => {
      const text = "internationalization";
      const tokens = tokenize(text);

      // Reconstruct the word from tokens
      let reconstructed = "";
      for (const token of tokens) {
        // Remove trailing hyphen to reconstruct
        reconstructed += token.word.replace(/-$/, "");
      }

      expect(reconstructed).toBe(text);
    });

    it("maintains correct indices for hyphenated words", () => {
      const text = "internationalization";
      const tokens = tokenize(text);

      // Verify each token's indices point to the right part of original text
      for (const token of tokens) {
        const wordWithoutHyphen = token.word.replace(/-$/, "");
        const mapped = text.slice(token.startIndex, token.endIndex);
        expect(mapped).toBe(wordWithoutHyphen);
      }

      // Verify all segments together reconstruct the original
      const reconstructed = tokens.map(t => t.word.replace(/-$/, "")).join("");
      expect(reconstructed).toBe(text);
    });
  });

  describe("slash splitting", () => {
    it("splits on forward slash, attaching slash to preceding word", () => {
      const tokens = tokenize("setTimeout/setInterval");
      expect(tokens).toHaveLength(2);
      expect(tokens[0].word).toBe("setTimeout/");
      expect(tokens[1].word).toBe("setInterval");
    });

    it("handles multiple slashes", () => {
      const tokens = tokenize("a/b/c");
      expect(tokens).toHaveLength(3);
      expect(tokens[0].word).toBe("a/");
      expect(tokens[1].word).toBe("b/");
      expect(tokens[2].word).toBe("c");
    });

    it("tracks positions correctly with slashes", () => {
      const text = "setTimeout/setInterval";
      const tokens = tokenize(text);

      // "setTimeout/" includes the slash
      expect(tokens[0].startIndex).toBe(0);
      expect(tokens[0].endIndex).toBe(10);
      expect(text.slice(tokens[0].startIndex, tokens[0].endIndex)).toBe("setTimeout");

      // "setInterval" starts after the slash
      expect(tokens[1].startIndex).toBe(11);
      expect(tokens[1].endIndex).toBe(22);
      expect(text.slice(tokens[1].startIndex, tokens[1].endIndex)).toBe("setInterval");
    });

    it("handles slash with trailing punctuation", () => {
      const tokens = tokenize("Hello/world!");
      expect(tokens).toHaveLength(2);
      expect(tokens[0].word).toBe("Hello/");
      expect(tokens[1].word).toBe("world!");
    });

    it("handles mixed whitespace and slashes", () => {
      const tokens = tokenize("foo/bar hello/world");
      expect(tokens).toHaveLength(4);
      expect(tokens[0].word).toBe("foo/");
      expect(tokens[1].word).toBe("bar");
      expect(tokens[2].word).toBe("hello/");
      expect(tokens[3].word).toBe("world");
    });

    it("verifies all tokens with slashes map back to original text", () => {
      const text = "setTimeout/setInterval fetch/XMLHttpRequest";
      const tokens = tokenize(text);

      for (const token of tokens) {
        // word may include slash, indices point to the word without slash
        const wordWithoutSlash = token.word.replace(/-$/, "").replace(/\/$/, "");
        const mapped = text.slice(token.startIndex, token.endIndex);
        expect(mapped).toBe(wordWithoutSlash);
      }
    });
  });

  describe("integration tests", () => {
    it("tokenizes complex text", () => {
      const text = "The quick brown fox jumps over the lazy dog.";
      const tokens = tokenize(text);

      expect(tokens.length).toBeGreaterThan(0);

      // Verify all tokens reconstruct the original
      let reconstructed = "";
      let currentPos = 0;

      for (const token of tokens) {
        // Add whitespace if there's a gap
        if (token.startIndex > currentPos) {
          reconstructed += text.slice(currentPos, token.startIndex);
        }
        reconstructed += token.word;
        currentPos = token.endIndex;
      }

      // Add trailing whitespace
      if (currentPos < text.length) {
        reconstructed += text.slice(currentPos);
      }

      expect(reconstructed).toBe(text);
    });
  });
});
