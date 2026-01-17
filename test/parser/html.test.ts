import { describe, expect, it } from "bun:test";
import { parseHtml } from "../../src/parser/html";

describe("parseHtml", () => {
  describe("basic heading detection", () => {
    it("parses h1 heading", () => {
      const doc = parseHtml("<h1>Main Title</h1>");
      expect(doc.blocks).toHaveLength(1);
      expect(doc.blocks[0].type).toBe("heading");
      expect(doc.blocks[0].level).toBe(1);
      expect(doc.blocks[0].text).toBe("Main Title");
    });

    it("parses h2 heading", () => {
      const doc = parseHtml("<h2>Section Title</h2>");
      expect(doc.blocks).toHaveLength(1);
      expect(doc.blocks[0].type).toBe("heading");
      expect(doc.blocks[0].level).toBe(2);
      expect(doc.blocks[0].text).toBe("Section Title");
    });

    it("parses all heading levels h1-h6", () => {
      const doc = parseHtml(
        "<h1>Level 1</h1><h2>Level 2</h2><h3>Level 3</h3><h4>Level 4</h4><h5>Level 5</h5><h6>Level 6</h6>"
      );
      expect(doc.blocks).toHaveLength(6);
      for (let i = 0; i < 6; i++) {
        expect(doc.blocks[i].type).toBe("heading");
        expect(doc.blocks[i].level).toBe((i + 1) as 1 | 2 | 3 | 4 | 5 | 6);
      }
    });
  });

  describe("paragraph detection", () => {
    it("parses single paragraph", () => {
      const doc = parseHtml("<p>Hello world.</p>");
      expect(doc.blocks).toHaveLength(1);
      expect(doc.blocks[0].type).toBe("paragraph");
      expect(doc.blocks[0].text).toBe("Hello world.");
    });

    it("parses multiple paragraphs", () => {
      const doc = parseHtml("<p>First paragraph.</p><p>Second paragraph.</p>");
      expect(doc.blocks).toHaveLength(2);
      expect(doc.blocks[0].text).toBe("First paragraph.");
      expect(doc.blocks[1].text).toBe("Second paragraph.");
    });

    it("treats div as paragraph", () => {
      const doc = parseHtml("<div>Content in div</div>");
      expect(doc.blocks).toHaveLength(1);
      expect(doc.blocks[0].type).toBe("paragraph");
      expect(doc.blocks[0].text).toBe("Content in div");
    });
  });

  describe("mixed headings and paragraphs", () => {
    it("parses h1 followed by paragraph", () => {
      const doc = parseHtml("<h1>Title</h1><p>Content</p>");
      expect(doc.blocks).toHaveLength(2);
      expect(doc.blocks[0].type).toBe("heading");
      expect(doc.blocks[0].level).toBe(1);
      expect(doc.blocks[0].text).toBe("Title");
      expect(doc.blocks[1].type).toBe("paragraph");
      expect(doc.blocks[1].text).toBe("Content");
    });

    it("parses realistic article structure", () => {
      const html = `
        <h1>Article Title</h1>
        <p>Introduction paragraph.</p>
        <h2>Section 1</h2>
        <p>Section 1 content.</p>
        <h2>Section 2</h2>
        <p>Section 2 content.</p>
      `;
      const doc = parseHtml(html);
      expect(doc.blocks).toHaveLength(6);

      expect(doc.blocks[0]).toMatchObject({
        type: "heading",
        level: 1,
        text: "Article Title",
      });
      expect(doc.blocks[1]).toMatchObject({ type: "paragraph" });
      expect(doc.blocks[2]).toMatchObject({
        type: "heading",
        level: 2,
      });
    });
  });

  describe("text extraction from HTML", () => {
    it("strips HTML tags from text", () => {
      const doc = parseHtml("<p>Hello <strong>world</strong>!</p>");
      expect(doc.blocks[0].text).toBe("Hello world!");
    });

    it("handles nested tags", () => {
      const doc = parseHtml(
        "<p>Text with <span><strong>nested</strong> tags</span>.</p>"
      );
      expect(doc.blocks[0].text).toBe("Text with nested tags.");
    });

    it("joins text across inline elements", () => {
      const doc = parseHtml(
        "<p>Hello <em>italic</em> and <strong>bold</strong> text.</p>"
      );
      expect(doc.blocks[0].text).toBe("Hello italic and bold text.");
    });

    it("normalizes whitespace", () => {
      const doc = parseHtml("<p>Hello    \n\n    world</p>");
      expect(doc.blocks[0].text).toBe("Hello world");
    });
  });

  describe("block IDs and structure", () => {
    it("assigns sequential numeric IDs", () => {
      const doc = parseHtml("<h1>A</h1><p>B</p><h2>C</h2>");
      expect(doc.blocks[0].id).toBe("1");
      expect(doc.blocks[1].id).toBe("2");
      expect(doc.blocks[2].id).toBe("3");
    });

    it("ensures all IDs are unique", () => {
      const doc = parseHtml(
        "<h1>1</h1><p>2</p><h2>3</h2><p>4</p><h3>5</h3>"
      );
      const ids = doc.blocks.map((b) => b.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it("includes required block properties", () => {
      const doc = parseHtml("<h1>Title</h1><p>Content</p>");
      for (const block of doc.blocks) {
        expect(block.id).toBeDefined();
        expect(block.type).toBeDefined();
        expect(block.text).toBeDefined();
      }
    });
  });

  describe("heading level property", () => {
    it("includes level property only for headings", () => {
      const doc = parseHtml("<h1>Heading</h1><p>Paragraph</p>");
      expect(doc.blocks[0].level).toBeDefined();
      expect(doc.blocks[0].level).toBe(1);
      expect(doc.blocks[1].level).toBeUndefined();
    });

    it("correctly assigns different heading levels", () => {
      const doc = parseHtml(
        "<h1>H1</h1><h2>H2</h2><h3>H3</h3><h4>H4</h4><h5>H5</h5><h6>H6</h6>"
      );
      for (let i = 0; i < 6; i++) {
        expect(doc.blocks[i].level).toBe((i + 1) as 1 | 2 | 3 | 4 | 5 | 6);
      }
    });
  });

  describe("edge cases", () => {
    it("handles empty HTML", () => {
      const doc = parseHtml("");
      expect(doc.blocks).toHaveLength(0);
    });

    it("handles HTML with only whitespace", () => {
      const doc = parseHtml("   \n\n   ");
      expect(doc.blocks).toHaveLength(0);
    });

    it("handles heading with no text", () => {
      const doc = parseHtml("<h1></h1><p>Content</p>");
      expect(doc.blocks).toHaveLength(1);
      expect(doc.blocks[0].type).toBe("paragraph");
    });

    it("handles paragraph with no text", () => {
      const doc = parseHtml("<h1>Title</h1><p></p>");
      expect(doc.blocks).toHaveLength(1);
      expect(doc.blocks[0].type).toBe("heading");
    });

    it("ignores script tags", () => {
      const doc = parseHtml(
        "<p>Before</p><script>console.log('test');</script><p>After</p>"
      );
      expect(doc.blocks).toHaveLength(2);
      expect(doc.blocks[0].text).toBe("Before");
      expect(doc.blocks[1].text).toBe("After");
    });

    it("ignores style tags", () => {
      const doc = parseHtml(
        "<p>Before</p><style>.hidden { display: none; }</style><p>After</p>"
      );
      expect(doc.blocks).toHaveLength(2);
      expect(doc.blocks[0].text).toBe("Before");
      expect(doc.blocks[1].text).toBe("After");
    });

    it("handles self-closing tags", () => {
      const doc = parseHtml("<p>Line 1<br/>Line 2</p>");
      expect(doc.blocks).toHaveLength(1);
      expect(doc.blocks[0].text).toContain("Line 1");
      expect(doc.blocks[0].text).toContain("Line 2");
    });

    it("handles encoded entities", () => {
      const doc = parseHtml("<p>&lt;tag&gt; &amp; special</p>");
      expect(doc.blocks[0].text).toContain("<tag>");
      expect(doc.blocks[0].text).toContain("&");
    });
  });

  describe("integration tests", () => {
    it("parses realistic blog post HTML", () => {
      const html = `
        <article>
          <h1>Understanding RSVP Reading</h1>
          <p>RSVP (Rapid Serial Visual Presentation) is a reading technique that displays text one word at a time.</p>

          <h2>Benefits</h2>
          <p>Increased reading speed and comprehension.</p>

          <h2>Getting Started</h2>
          <p>Choose your preferred reading speed and start pasting content.</p>
        </article>
      `;
      const doc = parseHtml(html);

      // Should have: 1 h1 + 1 intro p + 1 h2 + 1 p + 1 h2 + 1 p = 6 blocks
      const meaningfulBlocks = doc.blocks.filter(b => b.text.trim().length > 0);
      expect(meaningfulBlocks.length).toBeGreaterThanOrEqual(5);

      // First block should be the main heading
      const firstMeaningful = meaningfulBlocks[0];
      expect(firstMeaningful.type).toBe("heading");
      expect(firstMeaningful.level).toBe(1);
    });

    it("preserves document structure with mixed content", () => {
      const html = `
        <h1>Title</h1>
        <p>First section.</p>
        <h2>Subsection</h2>
        <p>Content here.</p>
        <h3>Details</h3>
        <p>More details.</p>
      `;
      const doc = parseHtml(html);

      for (const block of doc.blocks) {
        expect(block.id).toBeDefined();
        expect(block.type).toBeDefined();
        expect(block.text).toBeDefined();
        if (block.type === "heading") {
          expect(block.level).toBeDefined();
          expect([1, 2, 3, 4, 5, 6]).toContain(block.level);
        }
      }
    });
  });
});
