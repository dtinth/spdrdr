import { describe, expect, it } from "bun:test";
import { parsePlainText } from "../../src/parser/plaintext";

describe("parsePlainText", () => {
  describe("basic parsing", () => {
    it("parses single paragraph", () => {
      const doc = parsePlainText("Hello world.");
      expect(doc.blocks).toHaveLength(1);
      expect(doc.blocks[0]!.text).toBe("Hello world.");
      expect(doc.blocks[0]!.type).toBe("paragraph");
    });

    it("splits on double newlines", () => {
      const doc = parsePlainText("First.\n\nSecond.");
      expect(doc.blocks).toHaveLength(2);
      expect(doc.blocks[0]!.text).toBe("First.");
      expect(doc.blocks[1]!.text).toBe("Second.");
    });

    it("handles multiple blank lines", () => {
      const doc = parsePlainText("First.\n\n\n\nSecond.");
      expect(doc.blocks).toHaveLength(2);
      expect(doc.blocks[0]!.text).toBe("First.");
      expect(doc.blocks[1]!.text).toBe("Second.");
    });

    it("trims whitespace from paragraphs", () => {
      const doc = parsePlainText("  Hello world.  \n\n  Goodbye.  ");
      expect(doc.blocks[0]!.text).toBe("Hello world.");
      expect(doc.blocks[1]!.text).toBe("Goodbye.");
    });

    it("collapses multiple spaces", () => {
      const doc = parsePlainText("Hello    world    test.");
      expect(doc.blocks[0]!.text).toBe("Hello world test.");
    });

    it("skips empty paragraphs", () => {
      const doc = parsePlainText("First.\n\n\n\nSecond.\n\n\n\nThird.");
      expect(doc.blocks).toHaveLength(3);
      expect(doc.blocks[0]!.text).toBe("First.");
      expect(doc.blocks[1]!.text).toBe("Second.");
      expect(doc.blocks[2]!.text).toBe("Third.");
    });
  });

  describe("multi-line paragraphs", () => {
    it("joins lines in same paragraph", () => {
      const doc = parsePlainText("Line one\nLine two\nLine three");
      expect(doc.blocks).toHaveLength(1);
      expect(doc.blocks[0]!.text).toBe("Line one Line two Line three");
    });

    it("joins lines with various whitespace", () => {
      const doc = parsePlainText("Line one\n  Line two\n    Line three");
      expect(doc.blocks[0]!.text).toBe("Line one Line two Line three");
    });
  });

  describe("block IDs", () => {
    it("assigns sequential numeric IDs", () => {
      const doc = parsePlainText("A\n\nB\n\nC");
      expect(doc.blocks[0]!.id).toBe("1");
      expect(doc.blocks[1]!.id).toBe("2");
      expect(doc.blocks[2]!.id).toBe("3");
    });

    it("ensures all IDs are unique", () => {
      const doc = parsePlainText("A\n\nB\n\nC\n\nD\n\nE");
      const ids = doc.blocks.map(b => b.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  describe("external IDs (line numbers)", () => {
    it("tracks starting line number (1-indexed)", () => {
      const doc = parsePlainText("First paragraph\n\nSecond paragraph");
      expect(doc.blocks[0]!.externalId).toBe("1");
      expect(doc.blocks[1]!.externalId).toBe("3");
    });

    it("tracks line number after empty lines", () => {
      const doc = parsePlainText("First\n\n\n\nSecond");
      expect(doc.blocks[0]!.externalId).toBe("1");
      expect(doc.blocks[1]!.externalId).toBe("5");
    });

    it("handles multi-line paragraphs", () => {
      const doc = parsePlainText("Line 1\nLine 2\nLine 3\n\nPara 2");
      expect(doc.blocks[0]!.externalId).toBe("1");
      expect(doc.blocks[1]!.externalId).toBe("5"); // Line 1-3 + empty line 4 + Para 2 on line 5
    });

    it("handles paragraphs at start of file", () => {
      const doc = parsePlainText("Starting paragraph\n\nSecond");
      expect(doc.blocks[0]!.externalId).toBe("1");
    });

    it("handles paragraphs after leading blank lines", () => {
      const doc = parsePlainText("\n\nFirst paragraph");
      expect(doc.blocks[0]!.externalId).toBe("3");
    });
  });

  describe("block types", () => {
    it("sets type to paragraph for all blocks", () => {
      const doc = parsePlainText("A\n\nB\n\nC");
      for (const block of doc.blocks) {
        expect(block.type).toBe("paragraph");
      }
    });
  });

  describe("edge cases", () => {
    it("handles empty input", () => {
      const doc = parsePlainText("");
      expect(doc.blocks).toHaveLength(0);
    });

    it("handles only whitespace", () => {
      const doc = parsePlainText("   \n\n   \n\n   ");
      expect(doc.blocks).toHaveLength(0);
    });

    it("handles only newlines", () => {
      const doc = parsePlainText("\n\n\n\n");
      expect(doc.blocks).toHaveLength(0);
    });

    it("handles single line with no newline", () => {
      const doc = parsePlainText("Single line");
      expect(doc.blocks).toHaveLength(1);
      expect(doc.blocks[0]!.text).toBe("Single line");
    });

    it("handles text ending with newlines", () => {
      const doc = parsePlainText("Paragraph\n\n\n");
      expect(doc.blocks).toHaveLength(1);
      expect(doc.blocks[0]!.text).toBe("Paragraph");
    });

    it("handles text with tabs and newlines mixed", () => {
      const doc = parsePlainText("Para\tOne\n\nPara\tTwo");
      expect(doc.blocks).toHaveLength(2);
      expect(doc.blocks[0]!.text).toBe("Para One");
      expect(doc.blocks[1]!.text).toBe("Para Two");
    });
  });

  describe("integration tests", () => {
    it("parses realistic markdown-like text", () => {
      const text = `The quick brown fox jumps over the lazy dog.

This is a second paragraph with multiple
sentences across several lines.

And a third one.`;
      const doc = parsePlainText(text);

      expect(doc.blocks).toHaveLength(3);
      expect(doc.blocks[0]!.text).toBe("The quick brown fox jumps over the lazy dog.");
      expect(doc.blocks[1]!.text).toBe("This is a second paragraph with multiple sentences across several lines.");
      expect(doc.blocks[2]!.text).toBe("And a third one.");
    });

    it("preserves document structure", () => {
      const text = `Paragraph one.

Paragraph two.

Paragraph three.`;
      const doc = parsePlainText(text);

      expect(doc.blocks).toHaveLength(3);
      for (const block of doc.blocks) {
        expect(block.id).toBeDefined();
        expect(block.externalId).toBeDefined();
        expect(block.type).toBe("paragraph");
        expect(block.text).toBeTruthy();
      }
    });
  });
});
