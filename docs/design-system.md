# VibeBoard visual design

Use one semantic palette across Overview, project cards, Project settings, creation, documents, dialogs and portalled controls. Do not redefine the theme inside individual pages.

| Token | Light | Dark |
| --- | --- | --- |
| Canvas / --bg | #f7f7f8 | #18191b |
| Panel / --panel | #ffffff | #222325 |
| Border / --border | #dedee2 | #3a3b3e |
| Primary text / --ink | #27272a | #f0f0f1 |
| Secondary text / --muted | #65656f | #b2b2b9 |
| Accent / --accent | #13795f | #72c8ad |
| Soft accent / --soft | #eaf4ef | #263831 |

Canvas, cards, inputs and editor backgrounds remain neutral. Reserve teal for primary actions, focus, active indicators and small accents. Avoid blue text on blue surfaces, low-contrast colored paragraphs, and large tinted cards. Status colors convey status only and always have a text/icon label. Primary buttons need a contrasting label; placeholders and helper text remain readable in both themes. Use a distinct selection highlight and visible keyboard focus.

Use shared components and theme variables. Keep controls aligned, with at least 40px action targets and 12px between adjacent text actions. Let actions wrap with the same spacing on narrow screens. Do not override all button colors globally or hide secondary controls to compensate for layout problems.

Inspect the affected page in light and dark mode and a narrow viewport when the browser is available. TypeScript/build checks do not establish visual acceptance. Record limitations honestly.

The generated AGENTS.md template carries these conventions into new projects. Preserve an existing project's approved brand palette; for new projects without an approved palette, use these neutral light/dark surfaces and one restrained accent.


## VibeBoard HeroUI migration (20 October 2026)

VibeBoard itself now uses HeroUI v3: shared Button/Input/TextArea/Select wrappers, HeroUI Cards, document Tabs, Checkbox, Switch and Modal. App layout, task visualizations, rich Markdown editing and audio waveform remain purpose-built. Visible dropdowns use HeroUI; native selects generated internally for accessibility remain hidden. The prototype gallery illustrates user-selected libraries and does not change VibeBoard’s own library.

`app/hero-theme.css` is the app-wide theme authority, imported after legacy structural CSS. Its light tokens are canvas #f4f6f8, panel #ffffff, border #e4e8ee, ink #202735, muted #697386 and accent #087f69. Dark tokens are canvas #11151b, panel #1a2029, border #2c3542, ink #eef2f7, muted #a3afbf and accent #64d9b4. HeroUI semantic variables map to these same tokens. The earlier palette table remains the fallback for generated projects without a chosen brand; do not force HeroUI onto another project’s selected stack.

Rollback checkpoint: tag `checkpoint/pre-heroui-2026-10-20`, commit `e2ca7e2`. The migration lives on branch `ui/heroui-migration`; main remains at the checkpoint. To review the old UI, save any new work, switch to main, restore its dependencies with npm ci, and restart the development server. Switch back to the migration branch and reinstall its locked dependencies to return. No reset or deletion of project data is needed.

Validation: 63 existing tests, TypeScript and production build passed. Chrome walkthrough checked status filtering, project creation navigation, PRD/AGENTS tabs, both themes and task details. Responsive CSS is included; narrow-viewport and microphone/provider acceptance were not performed.
