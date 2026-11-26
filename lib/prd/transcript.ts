/** Remove duplicated boundary words introduced by an overlapping audio window. */
export function mergeTranscript(passages: string[]) {
  let words: string[] = [];
  const normalize = (word: string) => word.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
  for (const passage of passages) {
    const next = passage.trim().split(/\s+/).filter(Boolean);
    let overlap = 0;
    for (let length = Math.min(15, words.length, next.length); length >= 2; length--) {
      if (words.slice(-length).map(normalize).join(" ") === next.slice(0, length).map(normalize).join(" ")) { overlap = length; break; }
    }
    words = [...words, ...next.slice(overlap)];
  }
  return words.join(" ");
}
