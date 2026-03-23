-- Phase 4: deploy_jobs and merge_analyses tables

CREATE TABLE IF NOT EXISTS deploy_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES builder_sessions(id) ON DELETE CASCADE,
  forge_id uuid NOT NULL REFERENCES forges(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target text NOT NULL CHECK (target IN ('github', 'vercel', 'zip')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  github_repo_url text,
  vercel_deploy_url text,
  vercel_project_id text,
  error_message text,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS merge_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  forge_id uuid NOT NULL REFERENCES forges(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  pr_ids uuid[] NOT NULL DEFAULT '{}',
  groups jsonb NOT NULL DEFAULT '[]',
  suggestions jsonb NOT NULL DEFAULT '[]',
  risks jsonb NOT NULL DEFAULT '[]',
  merge_sequence jsonb NOT NULL DEFAULT '[]',
  raw_prompt text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_deploy_jobs_session_id ON deploy_jobs(session_id);
CREATE INDEX idx_deploy_jobs_forge_id ON deploy_jobs(forge_id);
CREATE INDEX idx_merge_analyses_forge_id ON merge_analyses(forge_id);

ALTER TABLE deploy_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE merge_analyses ENABLE ROW LEVEL SECURITY;

-- deploy_jobs policies
CREATE POLICY "deploy_jobs_select" ON deploy_jobs FOR SELECT USING (is_forge_member(forge_id));
CREATE POLICY "deploy_jobs_all" ON deploy_jobs FOR ALL USING (is_forge_member(forge_id));

-- merge_analyses policies
CREATE POLICY "merge_analyses_select" ON merge_analyses FOR SELECT USING (is_forge_member(forge_id));
CREATE POLICY "merge_analyses_all" ON merge_analyses FOR ALL USING (is_forge_member(forge_id));
