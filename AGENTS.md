<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## AIMS Academy UI rules

- Use shadcn/ui as the standard UI system throughout this project.
- Prefer official shadcn/ui blocks for dashboard, sidebar, and login layouts, and reuse the installed components in `src/components/ui`.
- Use shadcn/ui components for buttons, forms, tables, dialogs, navigation, and other interface controls. Add missing components through the shadcn CLI rather than recreating their styling or behavior.
- Keep styling consistent with the shared theme and CSS variables in `src/app/globals.css`. Use Tailwind CSS for layout and limited academy-specific adjustments.
- Use Lucide for icons and Recharts for charts.
- Do not introduce a competing UI library or replace the UI system without the user's explicit approval.
- Focus custom code on attendance workflows and application behavior; avoid rebuilding standard UI components or writing page-specific styles unnecessarily.
