# AIMS Academy Attendance Portal

Local Next.js 16 portal using TypeScript, Tailwind CSS, shadcn/ui, Recharts, and Lucide.

## Run locally

```sh
export PATH="/Users/farisul/Library/pnpm/bin:/Users/farisul/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback:$PATH"
cd /Users/farisul/Desktop/attendance
pnpm dev
```

Open http://localhost:3000. Demo login: `admin@aims.local` / `AimsDemo123!`.

`pnpm build` creates the production build; `pnpm start` serves it. `pnpm lint` checks code.

## Local features

- Responsive academy navigation and supplied logo.
- Student and teacher CRUD, unique IDs, search, level/status filters, and CSV exports.
- Student profiles with contact information, monthly attendance charts, date filters, and history.
- Student and teacher attendance by date and level. Unmarked is distinct from absent. Save updates one record per person/date; saved records can be removed.
- Overview and reports computed from saved attendance.
- Browser localStorage persistence, JSON backup/restore with confirmation and schema validation.
- New workspaces start empty. Existing sample people and their attendance are removed by a one-time migration. Real records are retained; students with old generic levels need an OTHM programme selected when edited.
- Student level dropdown contains the seven approved OTHM Level 3 and Level 5 programmes. Teacher choices are IT Lecturer, BM Lecturer, and THM Lecturer. Existing generic teacher levels need role assignment when edited.
- Overview attendance chart is filtered to one selected student programme.
- Browser tab login is a demo convenience, not secure authorization.

Records belong to the current browser and origin (including port). Use Settings to export backups before clearing storage or moving origins. No database or deployment is configured.

## Next phase

Replace the local repository adapter (`src/lib/local-store.ts`) with Supabase persistence; add Supabase Auth and database row-level authorization. Migrate validated records, then deploy to Vercel after approval. Do not expose the demo login as production authentication.

UI conventions are saved in AGENTS.md (also referenced by CLAUDE.md).
