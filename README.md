# Projects Tracker

A client-projects tracker. Next.js 16 (App Router) + React 19 + Tailwind v4 + shadcn/ui (new-york) + Supabase (Postgres + Auth). Black & white theme, no hues.

## Setup

### 1. Install

```bash
npm install
```

### 2. Create a Supabase project

1. Go to [supabase.com](https://supabase.com/dashboard) → New project.
2. Once provisioned, open **Settings → API**.
3. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key (optional, only for scripts) → `SUPABASE_SERVICE_ROLE_KEY`

### 3. Env vars

```bash
cp .env.example .env.local
```

Paste the values from step 2. `.env.local` is gitignored.

### 4. Run the migrations

Open **SQL editor** in your Supabase project. Run both files in order:

1. [supabase/migrations/0001_init.sql](supabase/migrations/0001_init.sql) — `profiles`, `projects`, enums, RLS, profile-on-signup trigger.
2. [supabase/migrations/0002_team_tasks.sql](supabase/migrations/0002_team_tasks.sql) — `profiles.role` column, `project_members`, `tasks`, helper SECURITY-DEFINER functions, hybrid-role RLS, project-creator auto-admin trigger, and a one-time backfill of profiles for any users created before 0001 ran.

Both files are idempotent — safe to re-run if something fails halfway.

If you prefer the CLI:

```bash
npx supabase login
npx supabase link --project-ref <your-ref>
npx supabase db push
```

### 5. Regenerate types (after linking)

```bash
npx supabase gen types typescript --linked > src/lib/supabase/types.ts
```

This overwrites the handwritten file with the real generated types. Safe — the hand-written file matches the migration exactly.

### 6. (Optional) Seed an admin user + sample projects

```bash
npm run seed
```

Defaults to creating `test@webuildtrades.com` / `Rainbow12345*` with the email pre-confirmed (so you can sign in immediately). Override via `ADMIN_EMAIL` / `ADMIN_PASSWORD` env vars. The script is idempotent — safe to re-run.

The seed will:
1. Create or find the test user in `auth.users`
2. Upsert their `profiles` row with `role = 'admin'` (so they're the global app-admin)
3. Insert sample projects (skipped if migrations haven't run yet — re-run after step 4)

### 7. Run dev server

```bash
npm run dev
```

Hit [http://localhost:3000](http://localhost:3000). You'll be redirected to `/login`. Sign in with the seeded credentials (or create a new account at `/signup`).

## Roles & permissions

Two layers:

- **Global** — `profiles.role`. App-level admin (set via the seed script). Sees everything.
- **Per-project** — `project_members.role`. Project creator becomes that project's admin automatically (via the `on_project_created` trigger).

| Action | App admin | Project admin | Project member | Assignee (task) |
|---|---|---|---|---|
| View project | ✓ | ✓ | ✓ | ✓ |
| Create project | ✓ | ✓ | ✓ | — |
| Update / delete project | ✓ | ✓ | — | — |
| Add / remove members | ✓ | ✓ | — | — |
| Create task | ✓ | ✓ | — | — |
| Update task status | ✓ | ✓ | — | ✓ (their own) |
| Delete task | ✓ | ✓ | — | — |

All of this is enforced by Postgres RLS in [supabase/migrations/0002_team_tasks.sql](supabase/migrations/0002_team_tasks.sql) — UI gating is a courtesy, the database is the gate.

## Project layout

See [.cursor/rules/architecture.mdc](.cursor/rules/architecture.mdc) for the full conventions. Quick map:

```
src/
  app/
    (app)/           Authenticated routes — dashboard, projects.
    (auth)/          Public routes — login, signup.
    auth/callback/   Supabase email-confirm callback.
  components/
    ui/              shadcn primitives (B&W tokens).
    layout/          Sidebar, header, app-shell.
    auth/            Login/signup forms.
    projects/        Feature components.
  lib/
    supabase/        Server/client/proxy factories + types + env guard.
    auth/            Server Actions: signIn, signUp, signOut.
    projects/        queries.ts (server-only reads) + mutations.ts (Server Actions).
  hooks/, types/
supabase/migrations/ Append-only SQL files.
proxy.ts             Next.js 16 proxy (was middleware).
```

## Theming

Strict B&W. All colors are grayscale OKLCH variables in [src/app/globals.css](src/app/globals.css). Use the semantic tokens (`var(--color-primary)`, `var(--color-muted-foreground)`, etc.), never raw Tailwind palette classes like `bg-blue-500` or `text-zinc-50`.

## Scripts

- `npm run dev` — dev server (Turbopack)
- `npm run build` — production build
- `npm run lint` — ESLint
- `npx tsc --noEmit` — type-check
