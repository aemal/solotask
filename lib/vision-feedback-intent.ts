/** Conservative local demo fallback, scoped by the caller to a selected feedback round.
 * This recognises an explicit instruction, never approval inferred from silence,
 * readiness, a question, a quotation, or a negative/conditional instruction.
 */
export function feedbackTakeoverIntent(text: string): boolean {
  const message = text.normalize('NFKC').toLowerCase().replace(/[’‘]/g, "'").replace(/\s+/g, ' ').trim();
  if (!message || message.length > 2000) return false;
  if (/[?？]/u.test(message)) return false;
  if (/\b(?:don't|do not|doesn't|didn't|can't|cannot|won't|wouldn't|shouldn't|mustn't|not|never|stop|wait|hold|pause|cancel|unless|until|if|before|later|tomorrow)\b/u.test(message)) return false;
  if (/\b(?:can|could|would|should|may|will|did|do|are|is)\s+(?:i|you|we|they|these|this|it|the team)\b/u.test(message)) return false;
  if (/["“”]/u.test(message) || /\b(?:said|says|asked|example|suppose|pretend|quote|wonder|whether|how|what|when|why|ready|readiness|explain|consider|thinking|might|will)\b/u.test(message)) return false;

  // Each branch requires an imperative plus a reference to this review/package.
  const reference = '(?:it|this|these|them|this package|the package|this feedback|the feedback|these reviews|my reviews|these tasks|the tasks|this round|the round|these tickets|the tickets)';
  return [
    `\\btake (?:${reference}) over\\b`,
    `\\btake over (?:${reference})\\b`,
    `\\b(?:go ahead and |please )?(?:start|begin|work on|implement|fix|process) (?:working on |on )?(?:${reference})\\b`,
    `\\b(?:give|assign|hand|delegate|send) (?:${reference}) (?:over )?to (?:the |our |your )?team\\b`,
    `\\blet(?:'s| us) (?:start|begin|work on|implement|fix) (?:working on |on )?(?:${reference})\\b`,
  ].some(pattern => new RegExp(pattern, 'u').test(message));
}
