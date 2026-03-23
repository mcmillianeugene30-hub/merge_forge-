# Changelog

## [Phase 3] — 2026-03-21

### Added

- `builder_sessions` table: tracks each build plan (prompt, target stack, status, summary)
- `builder_artifacts` table: generated source files linked to sessions (path, content, type, size)
- `repo_analysis_cache` table: cached repo analysis results per forge (summary, services, env vars)
- GitHub repo ingestion: paginate file trees + contents via Octokit, store in Supabase
- `POST /api/forge/[id]/builder/analyze` — triggers repo ingestion and caches analysis
- `POST /api/forge/[id]/builder/plan` — calls plan-merged-app Edge Function, stores session
- `POST /api/forge/[id]/builder/generate` — calls generate-app-artifacts Edge Function
- `GET /api/forge/[id]/builder/export` — zip + stream all artifacts from a session
- `supabase/functions/plan-merged-app` — analyzes repos, generates structured app plan (OpenAI/Groq)
- `supabase/functions/generate-app-artifacts` — scaffolds full Next.js 15 app from plan
- `supabase/functions/analyze-repos` — batch repo analysis with shared concept detection
- `lib/github-ingest.ts` — Octokit wrapper for tree/content pagination and AI summarization
- `lib/builder.ts` — helpers for status labels, artifact grouping, file language detection
- Builder tab UI: session list, prompt form, repo analysis card
- Builder session detail: artifact tree + code viewer, generate + export buttons
- Merge Center tab: PR analysis, conflict detection, merge sequencing cards (Phase 4 preview)
- `POST /api/forge/[id]/merge/suggest` — AI-powered PR grouping, suggestions, and risk analysis

### Changed

- `unified_issues` gain `builder_session_id` FK (optional link to build session)
- Forge tab order: Board → Builder → Repos → Merge Center

### Coming Next (Phase 4)

- Export artifacts as downloadable zip
- Push generated app to a new GitHub repo via Octokit
- One-click deploy to Vercel via Vercel Deploy API
- Merge Center: PR conflict detection and merge sequencing

## [Phase 4] — 2026-03-20

### Added
- deploy_jobs and merge_analyses tables with RLS
- Zip export: JSZip-powered download of all builder artifacts as .zip
- GitHub push: create new repo + single commit via Git Data API (create blobs → tree → commit → update ref)
- Vercel deploy: one-click production deploy via Vercel v13 Deployments API
- Deploy jobs tracking: status, history, Vercel polling for live build status
- DeployPanel: tabbed UI for zip / GitHub / Vercel with success state and job history
- Merge Center: full AI analysis page at /forge/[id]/merge-center
- Merge analysis detail: /forge/[id]/merge-center/[analysisId]
- MergeGroupsCard, MergeSuggestionsCard, MergeRisksCard, MergeSequenceCard, MergeHistoryList
- RunAnalysisButton component
- Merge Center tab fully wired on forge detail page
- All 6 tabs final on forge detail page

### Fixed
- suggest-merges edge function (Phase 1 audit): was a stub returning empty results — fully replaced with OpenAI/Groq/fallback implementation
- merge_sequence added to suggest-merges output (new Phase 4 field)

### Architecture notes
- Zip uses JSZip in Node.js route handler (not edge — needs Buffer)
- GitHub push uses Git Data API: blobs → tree → commit → ref (single clean commit for all files)
- Vercel deploy uses v13 API with file array — no prior project setup required
- All deploy jobs tracked in Supabase — queryable per session
- Merge Center analyses stored in Supabase for full history and detail views
