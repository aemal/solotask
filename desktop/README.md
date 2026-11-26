# VibeBoard feedback companion

Local Electron demo. It uses the existing VibeBoard React/HeroUI renderer and local Whisper service. No Samantha call takes place in this companion.

## Run

Start the VibeBoard web server on port 3015, then:

```sh
npm --prefix desktop install
npm --prefix desktop start
```

For another local server: `VIBEBOARD_URL=http://127.0.0.1:3000 npm --prefix desktop start`.

The web server must stay running. The window is limited to the trusted local capture route; no Node API is exposed to the renderer. All native operations run behind narrowly scoped IPC methods and sender checks.

## Review flow

1. Choose a screen. The window becomes a compact floating capture controller.
2. Start dictation with the microphone. This reuses local Whisper, not a live AI call.
3. Point to a problem in the selected display and press **Cmd/Ctrl+Shift+A**. A screenshot is taken and a normalized pointer coordinate becomes an editable arrow. Repeat to collect slides. The toolbar hides briefly during each capture.
4. Finish dictation before pressing Review. Transcript passages become editable notes/arrow labels. Capture before speaking also works: the remaining transcript attaches to the latest screenshot.
5. Review slides on the left, with the selected screenshot on the right. Add arrows, rectangles, ellipses and text; select a shape to edit its label or delete it. Edit title and feedback notes.
6. Name the feedback round and submit. The editor composes each screenshot into a permanent PNG, then submits the batch to the local web API. The raw screenshot and editable annotations remain in the local draft.
7. Open `/vision/feedback` in the web app to discuss the package with Samantha and approve the simulated handoff.

**Cmd/Ctrl+Shift+F** brings the companion forward. If either shortcut is already registered, an in-app warning is displayed and the capture button remains available.

## Data and permissions

Drafts are saved atomically under Electron's application userData directory as `feedback-draft.json`. Submitted PNGs and JSON are owned by the web server under `.vibeboard/vision-demo/feedback`. Failed submissions preserve the draft and use a stable idempotency ID on retry.

macOS requires Screen Recording and Microphone permission for Electron. Grant these in System Settings, Privacy & Security, then restart the companion when screen access was changed. A source list failure or empty screenshot is reported rather than treated as successful capture. The developer binary is not a signed/notarized installer.

On Linux Wayland, capture and global shortcut support depend on the desktop portals. Always-on-top placement and reliable global pointer coordinates are not guaranteed; manually add annotations in the editor when a pointer is unavailable. Native Windows/Linux, multi-monitor/HiDPI, actual microphone speech and macOS privacy permission acceptance require device testing. This implementation does not claim they have passed merely because JavaScript or TypeScript checks pass.

This is explicit screenshot capture, not a continuous screen video upload. No screen image is submitted until the owner clicks Submit feedback round. Annotations are intentionally orange so feedback remains visible against light and dark captured applications; the application chrome uses VibeBoard's shared semantic tokens.
