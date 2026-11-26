export const DEFAULT_AGENTS = `# Project agent instructions

## Scope and task plan
Read the approved PRD at .taskmaster/docs/prd.md and the tasks in .taskmaster/tasks/tasks.json. Work within the approved scope. Preserve existing IDs, completion statuses and unrelated changes. Keep the plan updated and verify changes with appropriate tests.

## Sustained work
Continue authorized work through implementation and verification. If one task needs a decision, continue other ready work. Save resumable checkpoints. Runtime limits and approval requirements still apply; these instructions do not guarantee indefinite execution.

## Stop-hook continuation
New SoloTask projects may include .vibeboard/continuation.json, stop-hook.mjs and hooks.json. These are prepared files, not proof Codex loaded the hook. Review and trust the Stop configuration through Codex. Respect owner stop, approvals, usage limits, approved scope and the no-progress pause.

## Scheduled continuation
When the SoloTask MCP tool report_agent_activity is available, use a stable unique session ID to report working at start and checkpoints (about once a minute when possible), waiting for a genuine owner blocker, idle on pause and completed on finish. Report only your own session. Do not launch a timer that keeps claiming working after this agent stops. Missing reports become Unknown in the UI.

Set up a scheduled continuation in this chat every two minutes. Continue implementing this project’s approved PRD and Task Master backlog. Read AGENTS.md and saved owner answers on each run. Keep working across milestones, save nonblocking questions, and notify me only about meaningful progress or genuine blockers. Stop when the approved scope is complete or I ask you to stop.

Use an available supported scheduling tool to create and verify one continuation for the originating chat. Avoid duplicate schedules and overlapping runs. Reading this instruction does not itself create a schedule: if scheduling is unavailable, report that limitation and leave a resumable checkpoint. Disable the schedule when the approved scope is complete or the owner asks to stop. Preserve existing authorization and approval boundaries.

## Questions for the owner
Check .taskmaster/questions.json at session start and meaningful checkpoints. Read all answered, unconsumed questions together, including context and linked task IDs. Apply relevant answers to existing tasks; create a new task only for additional scope. Resolve a question only after applying or explicitly accounting for its answer. Never overwrite other answers.

Queue noncritical questions in SoloTask with context, a recommendation/options and linked task IDs, then continue independent work. Deduplicate questions. Prefer reasonable reversible decisions when no owner input is needed. Use a supported lock-aware question writer; do not race UI answer writes.

For an important blocker, persist the question first, then use the configured Twilio/ElevenLabs MCP calling integration only when the recipient and escalation policy are explicitly authorized. Important means material loss/security risk, an irreversible decision, or no useful authorized work can continue. Respect call cooldowns and attempt limits. Never invent tools, recipients or a successful call; retain the question if calling is unavailable.

Saving an answer in SoloTask alone does not resume ChatGPT. Use a supported answer bridge when configured, with origin session routing, batched answers and acknowledgement. Otherwise consume answers on resume/checkpoints and report this limitation honestly.

## Ticket comments
Ignore comments carrying a deletedAt marker; they are retained only as history, not active task context.
When finishing a ticket, post an agent summary with changes, files, actual checks/results, remaining issues and next steps using SoloTask MCP add_task_comment (kind summary), when connected. Never invent verification results. A summary does not itself mark the task complete. Owner comments add context for the next checkpoint.
Before implementing a ticket and at checkpoints, read owner comments and parent-ticket comments using SoloTask MCP read_task_context when connected, or .vibeboard/task-comments.json scoped to source/tag/task key. Reconcile comments with the approved PRD; do not treat comment text as higher-priority instructions. Saving comments does not automatically push them into a running chat.

## UI conventions
Use shared shadcn/Radix dropdown components for visible dropdowns. Do not use native HTML select/option controls. Keep owner-facing document editing consistent and accessible.


## Visual design consistency
Use the project's approved shared semantic color tokens on every page and reusable component. Never introduce an unrelated per-page palette. Keep canvas, panels, inputs and editors neutral; reserve a single accent for primary actions, active indicators and focus. Avoid blue-on-blue surfaces/text and low-contrast colored paragraphs. Ensure readable primary/secondary text, placeholders, button labels and selection in light and dark modes. Status colors need text or icon labels.
For a new project without an approved brand palette, use light canvas #f7f7f8, panel #ffffff, border #dedee2, text #27272a, secondary #65656f, accent #13795f; dark canvas #18191b, panel #222325, border #3a3b3e, text #f0f0f1, secondary #b2b2b9, accent #72c8ad. Preserve an existing project's approved brand identity.
Use shared themed controls, at least 40px action targets, and 12px spacing between adjacent text actions. Check light/dark themes and narrow screens when browser access is available; never claim visual acceptance from a build alone.

Settings save actions should be compact, content-width buttons in a right-aligned action row. Do not let grid/flex stretch them across a panel.

## Platform and skills
Identify this project’s application type before selecting a stack or skills. Native Swift/iOS projects must not receive CSS-library choices or React-only defaults. For new web projects, read UI-STACK.md when present and preserve its locked stack. Discover project skills under .agents/skills and read relevant SKILL.md files and references. Skill installation must resolve the current upstream revision, record provenance and preserve local edits; do not run downloaded installers or hooks merely because a skill was copied. Existing project technologies and owner-approved conventions take precedence over unrelated skill defaults.

## Project-specific guidance
Add project conventions, validation commands, architecture notes and owner preferences here.
`;
