import { parseArgs } from "util";
import { parsePlainText } from "../src/parser/plaintext";
import { compile } from "../src/compiler/compile";
import { DEFAULT_TIMING_CONFIG, type TimingConfig } from "../src/timing/config";

const { values } = parseArgs({
  options: {
    wpm: { type: "string" },
    json: { type: "boolean" },
  },
});

/**
 * Read all input from stdin
 */
async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];

  for await (const chunk of Bun.stdin.stream()) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks).toString("utf-8");
}

/**
 * Display a single word with ORP highlighted at fixed position
 */
function displayWord(word: string, ropIndex: number): void {
  // Clear screen and position cursor
  process.stdout.write("\u001B[2J\u001B[0;0H");

  // Fixed focal point at center of screen
  const lines = process.stdout.rows || 24;
  const cols = process.stdout.columns || 80;
  const centerLine = Math.floor(lines / 2);
  const focalCol = Math.floor(cols / 2);

  // Position word so ORP character is at focal point
  const beforeORP = word.slice(0, ropIndex);
  const orp = word[ropIndex] || " ";
  const afterORP = word.slice(ropIndex + 1);

  // Calculate starting column to align ORP at focal point
  const startCol = Math.max(0, focalCol - ropIndex);

  // Build line with red ORP character
  const line =
    " ".repeat(startCol) +
    beforeORP +
    "\u001B[91m" + // Bright red
    orp +
    "\u001B[0m" + // Reset
    afterORP;

  // Position cursor at center line
  const padding = "\n".repeat(Math.max(0, centerLine - 1));
  process.stdout.write(padding + line + "\n");
}

/**
 * Play slides in terminal
 */
async function playSlides(
  slides: ReturnType<typeof compile>,
  startIndex = 0
): Promise<void> {
  for (let i = startIndex; i < slides.length; i++) {
    const slide = slides[i];

    displayWord(slide.word, slide.pivotIndex);

    // Wait for the slide duration
    await new Promise(resolve => setTimeout(resolve, slide.duration));
  }

  // Final clear
  process.stdout.write("\u001B[2J\u001B[0;0H");
  console.log("Done!");
}

/**
 * Output slides as JSON
 */
function outputJSON(slides: ReturnType<typeof compile>): void {
  console.log(JSON.stringify(slides, null, 2));
}

// Main execution with top-level await
try {
  // Read stdin
  const input = await readStdin();

  if (!input.trim()) {
    console.error("Error: No input provided");
    process.exit(1);
  }

  // Parse and compile
  const doc = parsePlainText(input);
  const config: TimingConfig = {
    ...DEFAULT_TIMING_CONFIG,
    ...(values.wpm && { wpm: parseInt(values.wpm, 10) }),
  };
  const slides = compile(doc, config);

  if (slides.length === 0) {
    console.error("Error: No words to display");
    process.exit(1);
  }

  // Output
  if (values.json) {
    outputJSON(slides);
  } else {
    // Play in terminal
    await playSlides(slides);
  }
} catch (err) {
  console.error("Error:", err instanceof Error ? err.message : String(err));
  process.exit(1);
}
