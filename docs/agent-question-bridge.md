# Agent questions and answer delivery

## Desired behavior
A project has a **Questions** tab with an unanswered-count badge. It is an inbox for owner decisions, including answers given by typing or dictation. The owner can answer questions one by one while agents continue independent work. Answered questions leave the unanswered count immediately; delivery and agent consumption remain separately visible. The target owner experience is inbox zero.

Noncritical questions queue without interruption. Important blockers persist first, then may escalate through the separately configured Twilio/ElevenLabs MCP calling integration. No call is made merely because a question is pending. The same question/answer must be shared between voice and web channels.

## Existing shared implementation inspected 2026-10-20
`lib/questions.ts` stores version-1 `.taskmaster/questions.json` files. A question has `id`, `question`, `context`, `taskIds`, `blocking`, `status` (`pending`, `answered`, `resolved`), `createdAt`, `answer`, `answeredAt`, `resolvedAt`, and optional `options`. The registered-project GET API reads questions; POST saves an owner answer. Atomic rename, a shared exclusive questions-file lock, a process queue and pre-publication external-change checks protect bridge writes. Legacy writers must cooperate with the same lock or migrate to the bridge; a writer ignoring locks still cannot be given an absolute race-free guarantee.

The owner UI now has an unanswered-count badge and pending/answered/resolved views. Project creation includes an editable Agent Smartness template that publishes root AGENTS.md, and registered projects have a collapsible revision-checked instructions editor.

The UI and disk persistence alone do not inject answers into ChatGPT, resume a stopped conversation, originate calls, or create Task Master tasks. The API now supports create-question and exact-answer consumption actions, with linked task validation and a shared lock. The local stdio MCP bridge exposes creation, batch reads and acknowledgement. Thread routing and automatic push/resume are still backlog items. No provider credentials, recipient or active call integration were verified in this session.

## Shared bridge contract to implement
- Project identity must be canonical and scoped to the authorized project. Persist `originThreadId`, optional host/session/run IDs, linked task IDs and stable question IDs. Missing origin routing must be shown as undeliverable; never guess a destination conversation.
- Add authenticated agent operations to create/deduplicate questions, fetch a batch of answered/unconsumed records, and acknowledge application. Use safe cross-process writes, schema validation, revisions and conflict detection. Reject stale answer changes and preserve unrelated answers.
- Distinguish question status from delivery status: pending owner decision; answered awaiting delivery; delivered awaiting application; consumed/resolved. Current v1 `answered` remains unconsumed until explicit resolution. Define a compatible migration rather than silently reinterpreting old records.
- On each checkpoint, pull all available answers for the originating project/run in one batch. A supported session adapter may also send one cohesive answer batch to the originating ChatGPT/Codex conversation and resume it when supported and authorized. Background delivery requires a real supported connector/runtime; do not simulate it with browser DOM injection.
- An answer batch includes IDs/revisions, original questions, relevant context, verbatim answers, linked tasks, and a stable batch ID. Delivery is at-least-once with idempotent application, persisted receipts and bounded backoff. Do not remove answers after send. Mark consumed only after agent acknowledgement of applying the exact answer revision. Preserve receipts across restarts.
- Surface queued/delivery failure/awaiting-agent states and a manual copy/export fallback. If session messaging is unavailable, keep the answers queued and make resume/checkpoint polling work. A paused model cannot be made to run forever by an AGENTS.md instruction.
- Apply decision answers to existing tasks when possible. Create a new Task Master task only when there is genuinely additional work, preserving IDs, status and provenance. Do not generate a task for every answer automatically.
- Calling adapter: reuse the other chat's implementation after inspecting it. Agree actual MCP tool names, authentication, approved recipient, which questions qualify, cooldown, maximum attempts, call outcome callbacks and answer correlation. An unanswered/failed call leaves the inbox question intact. No call occurs during tests.

## Acceptance scenarios
1. Three noncritical questions accumulate while other work proceeds; the badge shows 3. Saving two answers yields 1 and keeps both answers awaiting application.
2. At the next checkpoint the originating agent gets both saved answers in one batch. A retry does not apply an answer twice. Another project/thread receives neither.
3. A new answer introduces work: append one linked task; an answer clarifying an existing task creates no duplicate task.
4. Agent acknowledges application; resolved history remains, and the owner-facing pending inbox reaches zero without hiding undelivered answers.
5. A critical blocker creates one question and at most the configured call attempts. A call answer and web answer race safely; neither silently overwrites the other.
6. Restart, disconnected ChatGPT, stale revision, unavailable phone connector and multi-process writer conflicts retain recoverable data and actionable status.

## Coordination status
The user requested coordination with the other chat. Two attempts to list threads through the Codex app failed on 2026-10-20, so no destination thread could be identified or messaged. Existing uncommitted question files were inspected and preserved. This document is a shared working-tree handoff, not evidence that another chat has received it. Confirm the origin thread and calling adapter in the implementing session before enabling automatic delivery or calls.

## Ownership
The user assigned VibeBoard Agent Questions and Agent Smartness to this conversation on 2026-10-20. The other iPhone project conversation should continue its own Task Master backlog. That requested handoff has not been delivered because cross-thread discovery failed; this ownership note is the local coordination record.

## Local bridge verification
The project-scoped stdio bridge was live-tested reading Syncmote owner questions. Three pending trial decisions were created through the registered-project API, linked to tasks75/89,91,92. No answer was fabricated, no call was placed and no other-chat delivery was claimed. Automatic delivery remains pending.

## Lifecycle observation timestamps
The optional `pickedUpAt` field records the first explicit `read_owner_answers` MCP batch fetch via POST `action: pickup`. It remains `answered`; exact-answer acknowledgement still sets `resolvedAt` only after application. Owner/UI GET requests do not set pickup. This records a bridge fetch, not a guarantee of application or automatic chat resumption. Legacy records are not backfilled. The UI shows arrival, answer and pickup timestamps, relative ages, answer delay, pickup delay and separate acknowledgement time.

## Agent activity above task pulse
`report_agent_activity` accepts stable `sessionId`, `status` (working/waiting/idle/completed) and optional short `detail`. It writes project-scoped, server-timestamped signals via `/api/agent-activity`. The overview and project cards show latest per-session reports above the existing task pulse and report markers for the last hour. All reports expire to Unknown after two minutes. Missing reports never prove a stopped agent. No heartbeat timer is run by the bridge: agents explicitly report at start, checkpoints and stop. Existing sessions must load the updated MCP tool and report before this indicator can show activity; this does not automatically inspect ChatGPT or subscribe to Codex events.

## Ticket context and completion summaries

Ticket comments live in `.vibeboard/task-comments.json`, separate from Task Master task JSON. VibeBoard MCP `read_task_context` accepts taskId, optional tag/source and returns the task, its comments and parent-task comments for a subtask. `add_task_comment` accepts the exact returned key, text, kind (`comment` or `summary`) and optional stable retry ID. Agent summaries record actual changes/checks and remaining work; posting a summary does not change task status. Owner UI supports typed/dictated comments.

Agents must load the updated bridge, read comments when taking a task and at checkpoints, and post a truthful summary at completion. Templates include this protocol. These operations do not automatically inject comments into arbitrary existing ChatGPT threads or establish a live host MCP connection. Task Master’s own get-task operation does not read the sidecar; agents use the VibeBoard context tool or explicitly read the sidecar.
