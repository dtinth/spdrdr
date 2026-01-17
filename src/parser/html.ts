import { unified } from "unified";
import rehypeParse from "rehype-parse";
import { toText } from "hast-util-to-text";
import type { Element, Root } from "hast";
import type { Block, Document } from "../types";

/**
 * Parse HTML string into a Document
 *
 * Rules:
 * - h1-h6 tags become heading blocks with corresponding levels
 * - p, div, and other block elements become paragraph blocks
 * - Text is extracted and whitespace is normalized
 * - Empty blocks are skipped
 * - Script and style tags are ignored
 */
export function parseHtml(input: string): Document {
  const processor = unified().use(rehypeParse);
  const hast = processor.parse(input) as Root;

  const blocks: Block[] = [];
  let blockId = 1;

  // Track list context for numbering
  const listContext: { type: "ul" | "ol"; index: number }[] = [];

  // Process children recursively
  processNodes(hast.children, listContext, (element) => {
    blocks.push({
      id: String(blockId++),
      type: element.blockType,
      level: element.blockType === "heading" ? element.level : undefined,
      text: element.text,
    } as Block);
  });

  return { blocks };
}

/**
 * Process HAST nodes and extract content blocks
 * Returns blocks in document order
 */
function processNodes(
  nodes: any[],
  listContext: { type: "ul" | "ol"; index: number }[],
  onBlock: (block: BlockInfo) => void
): void {
  if (!Array.isArray(nodes)) return;

  for (const node of nodes) {
    // Skip non-element nodes
    if (node.type !== "element") continue;

    // Skip script and style tags
    if (node.tagName === "script" || node.tagName === "style") continue;

    // Check if this is a heading element
    const headingMatch = node.tagName?.match(/^h([1-6])$/);
    if (headingMatch) {
      const level = parseInt(headingMatch[1]) as 1 | 2 | 3 | 4 | 5 | 6;
      const text = normalizeText(toText(node));

      if (text.trim().length > 0) {
        onBlock({
          blockType: "heading",
          level,
          text,
        });
      }
      continue;
    }

    // Check if this is a list (ul or ol)
    if (node.tagName === "ul" || node.tagName === "ol") {
      // Push list context
      listContext.push({
        type: node.tagName,
        index: 1,
      });
      // Process list items
      processNodes(node.children, listContext, onBlock);
      // Pop list context
      listContext.pop();
      continue;
    }

    // Check if this is a list item (li)
    if (node.tagName === "li") {
      // Extract only direct text (excluding nested lists)
      const directText = extractDirectTextFromLi(node);
      const text = normalizeText(directText);

      if (text.trim().length > 0) {
        // Get current list type
        const currentList = listContext[listContext.length - 1];
        let prefix = "• ";

        if (currentList && currentList.type === "ol") {
          prefix = `${currentList.index}. `;
          currentList.index++;
        }

        onBlock({
          blockType: "paragraph",
          text: prefix + text,
        });
      }

      // Process nested lists within li
      for (const child of node.children || []) {
        if (child.type === "element" && (child.tagName === "ul" || child.tagName === "ol")) {
          listContext.push({
            type: child.tagName,
            index: 1,
          });
          processNodes(child.children || [], listContext, onBlock);
          listContext.pop();
        }
      }
      continue;
    }

    // Check if this is a structural container (article, section, main, div, etc.)
    // These should be recursed into, not treated as content blocks
    const containers = ["article", "section", "main", "div"];
    if (containers.includes(node.tagName ?? "")) {
      // Recurse into children
      processNodes(node.children, listContext, onBlock);
      continue;
    }

    // Check if this is a content block element (p, blockquote, etc.)
    const contentBlocks = ["p", "blockquote", "table", "pre"];
    if (contentBlocks.includes(node.tagName ?? "")) {
      const text = normalizeText(toText(node));

      if (text.trim().length > 0) {
        onBlock({
          blockType: "paragraph",
          text,
        });
      }
      continue;
    }

    // For unknown block elements, recurse into children
    if (node.children) {
      processNodes(node.children, listContext, onBlock);
    }
  }
}

interface BlockInfo {
  blockType: "heading" | "paragraph";
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  text: string;
}
/**
 * Extract direct text from li, excluding nested lists
 */
function extractDirectTextFromLi(node: any): string {
  let text = "";

  if (!node.children) return text;

  for (const child of node.children) {
    if (child.type === "text") {
      text += child.value;
    } else if (child.type === "element") {
      // Skip nested lists (ul, ol)
      if (child.tagName === "ul" || child.tagName === "ol") {
        continue;
      }
      // For other elements, extract text recursively
      text += extractDirectTextFromLi(child);
    }
  }

  return text;
}

/**
 * Normalize text: trim, collapse multiple spaces
 */
function normalizeText(text: string): string {
  return text
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\n+/g, " ");
}
