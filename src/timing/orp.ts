/**
 * Calculate the Optimal Recognition Point (ORP) position in a word
 * Returns the 0-indexed character position where the eye naturally focuses
 * when reading rapidly
 */
export function calculateORP(word: string): number {
  let baseLength = word.length;
  let orpIndex = 0;

  // Determine base ORP based on word length
  if (baseLength === 1) {
    orpIndex = 0;
  } else if (baseLength <= 4) {
    orpIndex = 1;
  } else if (baseLength <= 8) {
    orpIndex = 2;
  } else if (baseLength <= 13) {
    orpIndex = 3;
  } else {
    orpIndex = 4;
  }

  // Adjust for leading punctuation (quote, parenthesis)
  if (word[0] === '"' || word[0] === "'" || word[0] === "(") {
    orpIndex += 1;
  }

  // Ensure ORP doesn't exceed word length
  return Math.min(orpIndex, baseLength - 1);
}
