import type { Block, Document } from "../types";

/**
 * Parse plain text into a Document
 *
 * Rules:
 * - Split on double newlines (\n\n) into paragraphs
 * - Each paragraph becomes a Block with type: 'paragraph'
 * - Trim whitespace, collapse multiple spaces
 * - Empty paragraphs are skipped
 * - externalId tracks the starting line number (1-indexed)
 */
export function parsePlainText(input: string): Document {
  const lines = input.split("\n");
  const blocks: Block[] = [];
  let blockId = 1;
  let currentParagraph: string[] = [];
  let paragraphStartLine = 1;

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex];
    if (line === undefined) throw new Error(`Line at index ${lineIndex} is undefined`);
    const isEmptyLine = line.trim().length === 0;

    if (isEmptyLine) {
      // End current paragraph if any
      if (currentParagraph.length > 0) {
        const text = currentParagraph
          .join(" ")
          .trim()
          .replace(/\s+/g, " ");

        blocks.push({
          id: String(blockId),
          externalId: String(paragraphStartLine),
          type: "paragraph",
          text,
        });

        blockId++;
        currentParagraph = [];
      }
    } else {
      // Start new paragraph if needed
      if (currentParagraph.length === 0) {
        paragraphStartLine = lineIndex + 1; // 1-indexed
      }

      currentParagraph.push(line);
    }
  }

  // Handle last paragraph if any
  if (currentParagraph.length > 0) {
    const text = currentParagraph
      .join(" ")
      .trim()
      .replace(/\s+/g, " ");

    blocks.push({
      id: String(blockId),
      externalId: String(paragraphStartLine),
      type: "paragraph",
      text,
    });
  }

  return { blocks };
}
