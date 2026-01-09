/**
 * Block: A semantic unit of content (heading or paragraph)
 */
export interface Block {
  /** Internal unique ID (simple incrementing: "1", "2", "3"...) */
  id: string;

  /** Optional reference ID from external source (e.g., line number in source text) */
  externalId?: string;

  /** Block type */
  type: "heading" | "paragraph";

  /** Heading level 1-6 (only for type: 'heading') */
  level?: 1 | 2 | 3 | 4 | 5 | 6;

  /** Plain text content (no rich text/formatting) */
  text: string;
}

/**
 * Document: Top-level container for parsed content
 */
export interface Document {
  blocks: Block[];
  metadata?: {
    title?: string;
    source?: string;
  };
}

/**
 * Slide: A single display frame representing one word
 */
export interface Slide {
  /** The word to display */
  word: string;

  /** ORP (Optimal Recognition Point) position, 0-indexed */
  pivotIndex: number;

  /** Calculated display duration in milliseconds */
  duration: number;

  /** Absolute start time of this slide in milliseconds (cumulative) */
  startTime: number;

  /** Reference to parent block */
  blockId: string;

  /** Word position within the block (0-indexed) */
  wordIndex: number;

  /** Whether this is the last word in its block */
  isBlockEnd: boolean;

  /** Whether this is the last word in the document */
  isDocumentEnd: boolean;

  /** Start position of word in block text (0-indexed) */
  startIndex: number;

  /** End position of word in block text (exclusive) */
  endIndex: number;
}
