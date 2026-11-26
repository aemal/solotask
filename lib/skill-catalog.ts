export type SkillSource = { id: string; name: string; repo: string; directory: string; official: boolean; description: string; license: string };
export const skillCatalog: SkillSource[] = [
 { id: "impeccable", name: "Impeccable design", repo: "pbakaus/impeccable", directory: ".agents/skills/impeccable", official: true, description: "Design critique, hierarchy, typography, accessibility and polish from its author.", license: "Apache-2.0" },
 { id: "web-design-guidelines", name: "Vercel web interface guidelines", repo: "vercel-labs/agent-skills", directory: "skills/web-design-guidelines", official: true, description: "Accessibility, interaction and interface review.", license: "MIT" },
 { id: "react-best-practices", name: "Vercel React performance", repo: "vercel-labs/agent-skills", directory: "skills/react-best-practices", official: true, description: "React/Next.js rendering, data fetching and bundle performance.", license: "MIT" },
 { id: "composition-patterns", name: "Vercel component composition", repo: "vercel-labs/agent-skills", directory: "skills/composition-patterns", official: true, description: "Reusable React component architecture.", license: "MIT" },
 { id: "shadcn", name: "shadcn/ui", repo: "shadcn-ui/ui", directory: "skills/shadcn", official: true, description: "Maintainer guidance for source-owned components and theme tokens.", license: "MIT" },
 { id: "mui-theming", name: "Material UI theming", repo: "mui/material-ui", directory: "skills/material-ui-theming", official: true, description: "Material UI theme configuration; check the skill's target version.", license: "MIT" },
 { id: "mui-nextjs", name: "Material UI + Next.js", repo: "mui/material-ui", directory: "skills/material-ui-nextjs", official: true, description: "Next.js integration from Material UI maintainers.", license: "MIT" },
 { id: "chakra-ui", name: "Chakra UI builder", repo: "chakra-ui/chakra-ui", directory: "skills/chakra-ui-builder", official: true, description: "Chakra components, recipes and semantic tokens.", license: "MIT" },
 { id: "daisyui", name: "daisyUI", repo: "saadeghi/daisyui", directory: "skills/daisyui", official: true, description: "Maintainer guidance for daisyUI utilities, themes and components.", license: "MIT" },
 { id: "bootstrap-components", name: "Bootstrap components", repo: "twbs/bootstrap", directory: "skills/bootstrap-component", official: true, description: "Current upstream Bootstrap component guidance; may target a prerelease.", license: "MIT" },
 { id: "bootstrap-colors", name: "Bootstrap color system", repo: "twbs/bootstrap", directory: "skills/bootstrap-color-system", official: true, description: "Maintainer guidance for Bootstrap theme and color tokens.", license: "MIT" },
 { id: "mantine-components", name: "Mantine custom components", repo: "mantinedev/skills", directory: "skills/mantine-custom-components", official: true, description: "Official Mantine component composition.", license: "MIT" },
 { id: "mantine-forms", name: "Mantine forms", repo: "mantinedev/skills", directory: "skills/mantine-form", official: true, description: "Official form patterns and validation.", license: "MIT" },
 { id: "antd", name: "Ant Design", repo: "ant-design/antd-skill", directory: "skills/antd", official: true, description: "Ant Design maintainer skill; verify supported application version.", license: "MIT" },
 { id: "heroui", name: "HeroUI React", repo: "heroui-inc/heroui", directory: "skills/heroui-react", official: true, description: "Official HeroUI React component patterns.", license: "Apache-2.0" },
];
export const defaultSkillIds = ["impeccable", "web-design-guidelines", "react-best-practices", "composition-patterns"];
export const uiStacks = [
 { id: "shadcn", name: "shadcn/ui + Tailwind CSS", skills: ["shadcn"], docs: "https://ui.shadcn.com/docs", note: "Source-owned components. Recommended default." },
 { id: "tailwind", name: "Tailwind CSS", skills: [], docs: "https://tailwindcss.com/docs", note: "Utility-first CSS. No official standalone skill verified; includes web design defaults." },
 { id: "mui", name: "Material UI", skills: ["mui-theming", "mui-nextjs"], docs: "https://mui.com/material-ui/getting-started/", note: "Themeable React components with official skills." },
 { id: "chakra", name: "Chakra UI", skills: ["chakra-ui"], docs: "https://chakra-ui.com/docs", note: "Accessible React components and semantic theme tokens." },
 { id: "mantine", name: "Mantine", skills: ["mantine-components", "mantine-forms"], docs: "https://mantine.dev/", note: "React components, hooks and forms with maintainer skills." },
 { id: "antd", name: "Ant Design", skills: ["antd"], docs: "https://ant.design/docs/react/introduce", note: "Comprehensive application components with an official skill." },
 { id: "daisyui", name: "daisyUI + Tailwind CSS", skills: ["daisyui"], docs: "https://daisyui.com/docs/", note: "Class-based components and themes." },
 { id: "bootstrap", name: "Bootstrap", skills: ["bootstrap-components", "bootstrap-colors"], docs: "https://getbootstrap.com/docs/", note: "Official upstream skills may target Bootstrap 6 prerelease; keep application versions explicit." },
 { id: "heroui", name: "HeroUI", skills: ["heroui"], docs: "https://heroui.com/docs", note: "React components with an official skill." },
 { id: "radix", name: "Radix UI + custom CSS", skills: [], docs: "https://www.radix-ui.com/primitives/docs/overview/introduction", note: "Unstyled primitives. No dedicated official skill verified; includes web defaults." },
 { id: "bulma", name: "Bulma", skills: [], docs: "https://bulma.io/documentation/", note: "CSS framework. No dedicated official skill verified; includes web defaults." },
 { id: "css-modules", name: "CSS Modules / plain CSS", skills: [], docs: "https://nextjs.org/docs/app/getting-started/css", note: "Custom styling without a component library; includes web defaults." },
] as const;
export function skillsForStack(id: string) {
 const stack = uiStacks.find(s => s.id === id);
 if (!stack) throw Error("Choose a supported UI/CSS stack.");
 return { stack, sources: [...new Set([...defaultSkillIds, ...stack.skills])].map(id => skillCatalog.find(s => s.id === id)!) };
}
