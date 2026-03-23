# MergeForge

AI-powered multi-repo GitHub project management SaaS.

## Tech Stack

- **Framework**: Next.js 15.1.7 with React 19
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS v3 with shadcn/ui components
- **Database**: Supabase (PostgreSQL with SSR)
- **State Management**: TanStack Query v5
- **GitHub API**: Octokit v21
- **Realtime**: Supabase Realtime + Postgres Changes
- **Notifications**: Sonner
- **Theming**: next-themes with dark mode support

## Local Setup

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd mergeforge
   ```

2. **Copy environment variables**
   ```bash
   cp .env.example .env.local
   ```
   Fill in all values in `.env.local`.

3. **Install dependencies**
   ```bash
   npm install
   ```

4. **Start Supabase locally**
   ```bash
   npm run supabase:start
   ```
   Wait for Supabase to start. Note the URL and anon key from the output.

5. **Update `.env.local`** with your Supabase URL and anon key.

6. **Run database migrations**
   ```bash
   npm run supabase:reset
   ```
   This runs all migrations including the user trigger.

7. **Start the development server**
   ```bash
   npm run dev
   ```

## Supabase Setup

1. Create a project at [supabase.com](https://supabase.com)
2. Go to Project Settings > API
3. Copy the **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
4. Copy the **anon/public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY` (NOT `PUBLISHABLE_KEY`)
5. Copy the **service_role** key → `SUPABASE_SERVICE_ROLE_KEY`

## GitHub OAuth Setup

1. Go to [github.com/settings/developers](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in:
   - **Application name**: MergeForge (or any name)
   - **Homepage URL**: `http://localhost:3000`
   - **Authorization callback URL**: `http://localhost:3000/api/github/callback`
4. Click "Register application"
5. Copy **Client ID** → `GITHUB_CLIENT_ID`
6. Generate and copy **Client Secret** → `GITHUB_CLIENT_SECRET`
7. Also create a Personal Access Token with `repo` scope → `GITHUB_PERSONAL_ACCESS_TOKEN`

## Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (NOT PUBLISHABLE_KEY) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `NEXT_PUBLIC_APP_URL` | App URL (http://localhost:3000 for dev) |
| `GITHUB_CLIENT_ID` | GitHub OAuth App client ID |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App client secret |
| `GITHUB_PERSONAL_ACCESS_TOKEN` | GitHub PAT for API access |
| `OPENAI_API_KEY` | OpenAI API key (optional, for AI features) |
| `GROQ_API_KEY` | Groq API key (optional alternative for AI) |

## Phase 1 Features

- GitHub OAuth authentication
- Create and manage Forges (workspaces)
- Invite members to Forges (via direct database insertion for now)
- Link GitHub repositories to Forges
- View unified issues from linked repos
- View PR activity from linked repos
- Activity feed showing recent events
- Dark/light theme support
- Responsive design

## Phase 2 (Coming Next)

- Unified Kanban board with drag-and-drop
- Create issues directly in MergeForge
- Realtime board updates
- GitHub sync for issues and PRs
- Repo picker to link/unlink repositories
- Manual sync button
- Issue creation backed by GitHub

## Phase 3 (Coming Later)

- AI-powered merge suggestions
- Cross-repo PR relationship analysis
- Conflict detection and merge sequencing
- Builder sessions for AI code generation
- Architecture synthesis

---

## Changelog

### [Phase 2] — 2026-03-20

#### Added
- Unified Kanban board with 4 columns: To Do, In Progress, Review, Done
- Drag-and-drop issue reordering using @dnd-kit (React 19 compatible)
- Realtime board updates via Supabase Postgres changes subscription
- Create Issue dialog: supports virtual issues and GitHub-backed issues
- GitHub sync route: imports all issues + PRs from linked repos via Octokit paginate
- Repo picker component: browse and link GitHub repos to a Forge
- Sync button: one-click import of GitHub issues and PRs
- Board API routes: GET/POST/PATCH/DELETE for unified_issues
- Repos tab: repo linking UI + health card
- board_fields migration: position, source_repo_name, issue_type, mergeable_state, head_ref, base_ref

#### Changed
- Replaced @hello-pangea/dnd with @dnd-kit (React 19 compatibility fix)
- Forge detail page updated: Board tab and Repos tab are now fully functional
- Merge Center tab updated with Phase 3 preview description

#### Fixed
- NEXT_PUBLIC_SUPABASE_ANON_KEY used everywhere
- getSupabaseAdmin() is a function, not a module singleton
- Forge creation posts to /api/forges
- User trigger in migration file not seed.sql
- forge_members INSERT policy blocks self-enrollment

#### Coming Next (Phase 3)
- AI builder: repo ingestion, architecture synthesis, full-stack app generation
- Merge Center: PR relationship analysis, conflict detection, AI merge sequencing
- Builder sessions and artifact storage
