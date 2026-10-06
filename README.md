# AIMS Academy Attendance Portal

Next.js 16, TypeScript, Tailwind CSS, shadcn/ui, Supabase, Recharts, Lucide and pnpm.

## Run locally

Copy `.env.example` to `.env.local` and set the Supabase project URL and publishable key.
Never put a secret or service-role key in a NEXT_PUBLIC variable.

```sh
pnpm install
pnpm dev
```

Open http://localhost:3000. Sign in with a confirmed, approved Supabase account.
`pnpm build` creates the production build; `pnpm start` serves it; `pnpm lint` checks code.

## Administrator setup

In Supabase Authentication → Users, create the approved administrator account with a strong password and confirmed email. Dashboard developer membership is separate from app login.
There is no public registration page, demo password or browser-only authentication bypass.
Admin authorization uses confirmed identities from auth.users, an explicitly approved private email list, or an active user ID in public.admins. User-editable metadata does not grant access.
Only project administrators can change the approvals using SQL. No frontend can approve itself.
Disable public signups in Supabase Authentication settings when provisioning accounts through the dashboard.

## Features

- Student and teacher CRUD, unique IDs, search, filters and CSV exports.
- Student profiles, attendance charts, date filters and history.
- Student and teacher attendance, one entry per person per date; unmarked differs from absent.
- Seven approved OTHM programmes and IT/BM/THM lecturer roles.
- Overview chart filtered by student programme.
- Shared cloud records, JSON export/import with validation and confirmation.
- Database constraints reject duplicates, orphan records, invalid roles and future attendance.
- Atomic saves with revision checks reject stale edits. Reload and retry after concurrent changes.
- Existing local browser data remains untouched. Settings can export it for reviewed import.

## Database

Versioned SQL in supabase/migrations records the applied cloud setup.
All public tables enable RLS. Anonymous users have no table or workspace RPC access.
Authenticated accounts require administrator approval; the private approval lookup cannot be read or edited by clients.
The private security-definer lookup has a fixed empty search path and checks auth.uid().
Workspace functions run as the caller and enforce approval, constraints and transactional writes.
The adapter keeps the existing local-store.ts filename for compatibility but persists to Supabase rather than localStorage.

## Deployment

Vercel deployment remains pending approval. Add the two environment variables there, configure Supabase site/redirect URLs for the chosen domain, then verify admin login and CRUD in a preview before production.
Configure email delivery/recovery and account protection in Supabase before production.
UI conventions are in AGENTS.md. Install additional shadcn components with `pnpm dlx shadcn@latest add <component>`; its CLI is not an application runtime dependency.

The official shadcn stylesheet is vendored with its license in src/styles to keep the CLI out of runtime dependencies.

Security checks: production dependency audit and Supabase security advisors are clean. The development-only ESLint dependency currently inherits the unpatched braces advisory GHSA-vfj7-8cjw-p6xm; do not process untrusted glob patterns in tooling.
