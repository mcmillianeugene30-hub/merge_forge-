-- Phase 5 v2: agent_runs, agent_events, agent_files, agent_test_results

CREATE TABLE IF NOT EXISTS agent_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES builder_sessions(id) ON DELETE CASCADE,
  forge_id uuid NOT NULL REFERENCES forges(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','completed','failed','cancelled')),
  current_agent text,
  total_files integer NOT NULL DEFAULT 0,
  completed_files integer NOT NULL DEFAULT 0,
  failed_files integer NOT NULL DEFAULT 0,
  tests_written integer NOT NULL DEFAULT 0,
  tests_passed integer NOT NULL DEFAULT 0,
  tests_failed integer NOT NULL DEFAULT 0,
  lint_errors_fixed integer NOT NULL DEFAULT 0,
  plan jsonb NOT NULL DEFAULT '{}',
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agent_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES agent_runs(id) ON DELETE CASCADE,
  agent text NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('start','progress','file_start','file_done','file_error','fix_start','fix_done','test_start','test_pass','test_fail','lint_start','lint_done','deploy_start','deploy_done','complete','error')),
  message text NOT NULL,
  file_path text,
  file_content text,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agent_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES agent_runs(id) ON DELETE CASCADE,
  path text NOT NULL,
  content text NOT NULL,
  language text NOT NULL DEFAULT 'typescript',
  file_type text NOT NULL DEFAULT 'source' CHECK (file_type IN ('source','test','config','schema','env','readme')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','generating','done','error','fixed','lint_fixed','test_written')),
  attempts integer NOT NULL DEFAULT 0,
  lint_errors integer NOT NULL DEFAULT 0,
  test_status text CHECK (test_status IN ('pending','written','passing','failing','skipped')),
  error_detail text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(run_id, path)
);

CREATE TABLE IF NOT EXISTS agent_test_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES agent_runs(id) ON DELETE CASCADE,
  test_file_path text NOT NULL,
  source_file_path text NOT NULL,
  status text NOT NULL CHECK (status IN ('pending','running','passed','failed','error')),
  output text,
  error_detail text,
  attempt integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_agent_runs_session ON agent_runs(session_id);
CREATE INDEX idx_agent_runs_forge ON agent_runs(forge_id);
CREATE INDEX idx_agent_events_run_id ON agent_events(run_id);
CREATE INDEX idx_agent_files_run_id ON agent_files(run_id);
CREATE INDEX idx_agent_events_created ON agent_events(created_at DESC);
CREATE INDEX idx_agent_test_results_run ON agent_test_results(run_id);

ALTER TABLE agent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_test_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agent_runs select for forge member" ON agent_runs FOR SELECT USING (
  EXISTS (SELECT 1 FROM forges WHERE id = agent_runs.forge_id AND created_by = auth.uid())
);
CREATE POLICY "agent_runs insert for authenticated" ON agent_runs FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "agent_runs update for owner" ON agent_runs FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "agent_events select for forge member" ON agent_events FOR SELECT USING (
  EXISTS (SELECT 1 FROM agent_runs ar WHERE ar.id = agent_events.run_id AND ar.created_by = auth.uid())
);
CREATE POLICY "agent_events insert for authenticated" ON agent_events FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "agent_files select for forge member" ON agent_files FOR SELECT USING (
  EXISTS (SELECT 1 FROM agent_runs ar WHERE ar.id = agent_files.run_id AND ar.created_by = auth.uid())
);
CREATE POLICY "agent_files insert for authenticated" ON agent_files FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "agent_files update for owner" ON agent_files FOR UPDATE USING (
  EXISTS (SELECT 1 FROM agent_runs ar WHERE ar.id = agent_files.run_id AND ar.created_by = auth.uid())
);

CREATE POLICY "agent_test_results select for member" ON agent_test_results FOR SELECT USING (
  EXISTS (SELECT 1 FROM agent_runs ar WHERE ar.id = agent_test_results.run_id AND ar.created_by = auth.uid())
);
CREATE POLICY "agent_test_results insert for authenticated" ON agent_test_results FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "agent_test_results update for owner" ON agent_test_results FOR UPDATE USING (
  EXISTS (SELECT 1 FROM agent_runs ar WHERE ar.id = agent_test_results.run_id AND ar.created_by = auth.uid())
);

ALTER PUBLICATION supabase_realtime ADD TABLE agent_events;
ALTER PUBLICATION supabase_realtime ADD TABLE agent_files;
ALTER PUBLICATION supabase_realtime ADD TABLE agent_test_results;
