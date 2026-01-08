import { tokenize } from "../tokenizer/tokenize";
import { calculateORP } from "../timing/orp";
import { calculateDuration, calculateMultipliers } from "../timing/duration";
import { DEFAULT_TIMING_CONFIG, type TimingConfig } from "../timing/config";
import type { Block, Document, Slide } from "../types";

/**
 * Compile a Document into an array of Slides ready for playback
 *
 * Process:
 * 1. For each block, tokenize the text
 * 2. For each token, create a Slide with timing and positioning info
 * 3. Track block boundaries and document boundaries
 */
export function compile(
  document: Document,
  config: TimingConfig = DEFAULT_TIMING_CONFIG
): Slide[] {
  const slides: Slide[] = [];

  if (document.blocks.length === 0) {
    return slides;
  }

  let cumulativeTime = 0;

  for (let blockIndex = 0; blockIndex < document.blocks.length; blockIndex++) {
    const block = document.blocks[blockIndex];
    const tokens = tokenize(block.text);
    const isLastBlock = blockIndex === document.blocks.length - 1;

    for (let wordIndex = 0; wordIndex < tokens.length; wordIndex++) {
      const token = tokens[wordIndex];
      const isLastWordInBlock = wordIndex === tokens.length - 1;
      const isLastWordInDocument = isLastBlock && isLastWordInBlock;

      const pivotIndex = calculateORP(token.word);
      const duration = calculateDuration(token.word, config, {
        isBlockEnd: isLastWordInBlock,
        isHeading: block.type === "heading",
      });

      slides.push({
        word: token.word,
        pivotIndex,
        duration,
        startTime: cumulativeTime,
        blockId: block.id,
        wordIndex,
        isBlockEnd: isLastWordInBlock,
        isDocumentEnd: isLastWordInDocument,
      });

      cumulativeTime += duration;
    }

    // Add block gap after each block (except the last one)
    if (!isLastBlock) {
      cumulativeTime += config.blockGap;
    }
  }

  return slides;
}
