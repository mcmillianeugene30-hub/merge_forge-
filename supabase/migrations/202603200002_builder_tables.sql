-- Phase 3: Builder tables

-- builder_sessions: each plan/generate cycle
CREATE TABLE IF NOT EXISTS builder_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  forge_id uuid NOT NULL REFERENCES forges(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt text NOT NULL,
  target_stack jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','analyzing','planning','generating','completed','failed')),
  summary text,
  plan jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- builder_artifacts: generated files from a session
CREATE TABLE IF NOT EXISTS builder_artifacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES builder_sessions(id) ON DELETE CASCADE,
  path text NOT NULL,
  content text NOT NULL,
  artifact_type text NOT NULL DEFAULT 'code'
    CHECK (artifact_type IN ('code','plan','schema','env','readme')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- repo_analysis_cache: cached repo analysis per linked repo
CREATE TABLE IF NOT EXISTS repo_analysis_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  forge_id uuid NOT NULL REFERENCES forges(id) ON DELETE CASCADE,
  linked_repo_id uuid NOT NULL REFERENCES linked_repos(id) ON DELETE CASCADE,
  summary jsonb NOT NULL DEFAULT '{}',
  file_map jsonb NOT NULL DEFAULT '[]',
  dependencies jsonb NOT NULL DEFAULT '[]',
  env_vars jsonb NOT NULL DEFAULT '[]',
  services jsonb NOT NULL DEFAULT '[]',
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (forge_id, linked_repo_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_builder_sessions_forge_id ON builder_sessions(forge_id);
CREATE INDEX IF NOT EXISTS idx_builder_artifacts_session_id ON builder_artifacts(session_id);
CREATE INDEX IF NOT EXISTS idx_repo_analysis_cache_forge_id ON repo_analysis_cache(forge_id);

-- Enable RLS
ALTER TABLE builder_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE builder_artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE repo_analysis_cache ENABLE ROW LEVEL SECURITY;

-- RLS policies: builder_sessions
CREATE POLICY "builder_sessions_select" ON builder_sessions
  FOR SELECT USING (is_forge_member(forge_id));
CREATE POLICY "builder_sessions_all" ON builder_sessions
  FOR ALL USING (is_forge_member(forge_id)) WITH CHECK (is_forge_member(forge_id));

-- RLS policies: repo_analysis_cache
CREATE POLICY "repo_analysis_cache_select" ON repo_analysis_cache
  FOR SELECT USING (is_forge_member(forge_id));
CREATE POLICY "repo_analysis_cache_all" ON repo_analysis_cache
  FOR ALL USING (is_forge_member(forge_id)) WITH CHECK (is_forge_member(forge_id));

-- RLS policies: builder_artifacts (subquery via session → forge)
CREATE POLICY "builder_artifacts_select" ON builder_artifacts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM builder_sessions bs
      WHERE bs.id = builder_artifacts.session_id
        AND is_forge_member(bs.forge_id)
    )
  );
CREATE POLICY "builder_artifacts_all" ON builder_artifacts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM builder_sessions bs
      WHERE bs.id = builder_artifacts.session_id
        AND is_forge_member(bs.forge_id)
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM builder_sessions bs
      WHERE bs.id = builder_artifacts.session_id
        AND is_forge_member(bs.forge_id)
    )
  );
