import { test } from "node:test";
import assert from "node:assert/strict";
import { johnJoined, parseVisionReply } from "../lib/vision-conversation";
test("normal greeting and a proposed invitation do not falsely join John", () => {
  assert.equal(
    johnJoined("Hey Aemal, Samantha here. Shall I bring John in?", "samantha"),
    false,
  );
  assert.equal(johnJoined("John here.", "john"), false);
  assert.equal(
    johnJoined("Hey Aemal, hey Samantha. John here.", "samantha"),
    true,
  );
});
test("group voice markup becomes distinct readable speaker messages", () => {
  assert.deepEqual(
    parseVisionReply(
      "I will bring John in. <john>Hey Aemal, hey Samantha. John here. The fix is in the prototype.</john> Let us prioritize it.",
      "Samantha",
      false,
    ),
    [
      { role: "Samantha", text: "I will bring John in." },
      {
        role: "John",
        text: "Hey Aemal, hey Samantha. John here. The fix is in the prototype.",
      },
      { role: "Samantha", text: "Let us prioritize it." },
    ],
  );
});
test("untagged screen review can attribute the two explicit speakers", () => {
  assert.deepEqual(
    parseVisionReply(
      "John here. The resend action is missing. Samantha here. Bob owns the implementation.",
      "Samantha",
      true,
    ),
    [
      { role: "John", text: "John here. The resend action is missing." },
      { role: "Samantha", text: "Samantha here. Bob owns the implementation." },
    ],
  );
  assert.deepEqual(
    parseVisionReply("<john>The endpoint is next.</john>", "Bob", false),
    [{ role: "Bob", text: "The endpoint is next." }],
  );
});

test('removes provider emotion cues from visible dialogue', () => {
  assert.deepEqual(parseVisionReply('<john>[happy] John here. I can see the bug.</john>', 'Samantha', true), [{ role: 'John', text: 'John here. I can see the bug.' }]);
});

test("any teammate can speak without joining merely from a mention", () => {
  assert.deepEqual(parseVisionReply("Lisa owns deployment. Shall I invite her?", "Samantha", true), [{role:"Samantha", text:"Lisa owns deployment. Shall I invite her?"}]);
  assert.deepEqual(parseVisionReply("Lisa here. The deployment is staged. Poja: I will check Safari.", "Samantha", true), [{role:"Lisa",text:"Lisa here. The deployment is staged."},{role:"Poja",text:"I will check Safari."}]);
});

test("speaker prefixes are metadata rather than duplicated message text", () => {
 assert.deepEqual(parseVisionReply("Lisa: The pipeline is ready. Bob: I will wire the endpoint.", "Samantha", true), [{role:"Lisa",text:"The pipeline is ready."},{role:"Bob",text:"I will wire the endpoint."}]);
});
