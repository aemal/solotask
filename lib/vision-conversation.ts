export type VisionMessage = { role: string; text: string };
/** Decode provider character-voice tags without displaying speech markup. */
export function parseVisionReply(
  text: string,
  lead: string,
  group: boolean,
): VisionMessage[] {
  const primary = lead;
  const messages: VisionMessage[] = [];
  let speaker = primary;
  const parts = text.split(/(<\/?(?:john|samantha|bob|lisa|poja|default)>)/gi);
  for (const part of parts) {
    const tag = part.match(/^<(john|samantha|bob|lisa|poja)>$/i);
    if (tag) {
      speaker = tag[1].toLowerCase() === "john" && lead === "Bob" && !group ? "Bob" : tag[1][0].toUpperCase() + tag[1].slice(1).toLowerCase();
      continue;
    }
    if (
      /^<\/(?:john|samantha|bob|lisa|poja|default)>$|^<(?:samantha|default)>$/i.test(part)
    ) {
      speaker = primary;
      continue;
    }
    for (const section of part.split(
      /(?=(?:Hey Aemal, hey Samantha\.\s*)?(?:Samantha|Bob|Lisa|John|Po+ja|QA Officer)(?: here\.|:))/i,
    )) {
      const clean = section
        .replace(
          /\[(?:happy|sad|excited|curious|thoughtful|laughs|chuckles|sighs|whispers|serious|calm)\]/gi,
          "",
        )
        .trim();
      if (!clean) continue;
      if (/^(?:Hey Aemal, hey Samantha\.\s*)?John here\./i.test(clean))
        speaker = "John";
      else {
        const named = clean.match(/^(Samantha|Bob|Lisa|John|Po+ja|QA Officer)(?: here\.|:)/i);
        if (named) speaker = named[1][0].toUpperCase() + named[1].slice(1).toLowerCase();
      }
      const visible = clean.replace(/^(?:Samantha|Bob|Lisa|John|Po+ja|QA Officer):\s*/i, "");
      if (!visible) continue;
      const previous = messages.at(-1);
      if (previous?.role === speaker) previous.text += " " + visible;
      else messages.push({ role: speaker, text: visible });
    }
  }
  return messages;
}
export function johnJoined(text: string, leadId: string) {
  return leadId === "samantha" && /<john>|\bJohn here\b|\bJohn:\s/i.test(text);
}
