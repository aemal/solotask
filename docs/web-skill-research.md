# Web skill source research

Researched 2026-10-20 against author/maintainer repositories. Source catalog entries are lookup locations, not frozen copies. Installation resolves the default branch at that moment, then downloads all selected package files from that immutable revision. The project records hashes, revision, repository, folder and installation time. Updates resolve upstream again and refuse to overwrite local changes.

| Guidance | Authoritative source | License / notes |
| --- | --- | --- |
| Impeccable | https://github.com/pbakaus/impeccable | Apache-2.0. Design craft, critique, polish and review. Retain NOTICE. Optional helpers/hooks are not activated by file copying. |
| Web interface review | https://github.com/vercel-labs/agent-skills/tree/main/skills/web-design-guidelines | MIT declared in upstream README. Also consult https://github.com/vercel-labs/web-interface-guidelines. |
| React performance | https://github.com/vercel-labs/agent-skills/tree/main/skills/react-best-practices | Includes compiled AGENTS.md and rule references. Preserve entire package. |
| React composition | https://github.com/vercel-labs/agent-skills/tree/main/skills/composition-patterns | Compatible web React guidance, not Swift guidance. |
| shadcn/ui | https://github.com/shadcn-ui/ui/tree/main/skills/shadcn | MIT. Official install guidance: https://ui.shadcn.com/docs/skills. Source-owned components make stack migration a separate operation. |
| Material UI | https://github.com/mui/material-ui/tree/master/skills | MIT. Theming and Next.js packages found. Check target version before applying latest instructions. |
| Chakra UI | https://github.com/chakra-ui/chakra-ui/tree/main/skills/chakra-ui-builder | MIT. Builder and semantic-token guidance; migration/refactor skills exist but are not a reason to migrate a locked project. |
| Mantine | https://github.com/mantinedev/skills | MIT. Custom components, forms and combobox packages found. |
| Ant Design | https://github.com/ant-design/antd-skill | MIT. Current antd skill; older-version guidance exists separately. |
| daisyUI | https://github.com/saadeghi/daisyui/tree/master/skills/daisyui | MIT. Nested skill/reference Markdown is part of the package. |
| Bootstrap | https://github.com/twbs/bootstrap/tree/main/skills | MIT. Official AI docs: https://getbootstrap.com/docs/6.0/getting-started/ai/. Current skill content may target v6 prerelease. |
| HeroUI | https://github.com/heroui-inc/heroui/tree/v3/skills/heroui-react | Apache-2.0 in the inspected repository. Do not assume all UI skills are MIT. |

No dedicated official standalone skill was verified for plain Tailwind, Radix primitives, Bulma or CSS Modules. They may use general web guidance plus their official documentation, with that limitation shown clearly. Third-party Tailwind packages were researched but are not silently called official or used as mandatory defaults. A separate native-platform research task covers Swift/SwiftUI/UIKit and other non-web targets.

Current Next.js guidance in https://github.com/vercel-labs/next-skills says next-best-practices is no longer a standalone skill; prefer the framework's bundled documentation/generated agent guidance rather than installing a stale catalog copy.

Vercel's inspected repository declares MIT in README without shipping a standalone LICENSE file. The downloader preserves that README and a provenance note. It does not invent a copyright notice or pretend a separate LICENSE existed. Other packages require a real upstream license file. Custom source imports do not gain an "official" label merely because they are hosted on GitHub.

## Verification checkpoint
A live download through the production downloader resolved shadcn-ui/ui revision ba1503c64472b82256d9de95e2e62c5901a38e8b and retrieved 22 package/license files, including two binary reference assets. This is evidence of source retrieval only, not evidence a coding agent loaded the skill or that a generated app adopted shadcn.

61 tests and a production build passed for the prototype checkpoint. The platform-aware creation wizard, native skill defaults, visual gallery fidelity and full end-to-end owner acceptance remain Task Master work. New-project web setup is gated off until explicit application-type selection exists. Existing projects can review/install skills in settings; this does not migrate their application stack.
