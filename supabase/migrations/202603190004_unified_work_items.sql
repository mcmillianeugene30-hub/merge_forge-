-- Unified issues table
CREATE TABLE unified_issues (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  forge_id UUID REFERENCES forges(id) ON DELETE CASCADE NOT NULL,
  source_repo_id UUID REFERENCES linked_repos(id) ON DELETE SET NULL,
  github_issue_number INTEGER,
  title TEXT NOT NULL,
  body TEXT,
  status TEXT DEFAULT 'todo' NOT NULL,
  labels TEXT[] DEFAULT '{}',
  assignee_ids TEXT[] DEFAULT '{}',
  milestone UUID REFERENCES forge_milestones(id) ON DELETE SET NULL,
  linked_pr_url TEXT,
  github_issue_url TEXT,
  source_type TEXT DEFAULT 'virtual' CHECK (source_type IN ('github', 'virtual')) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- PR activity table
CREATE TABLE pr_activity (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  forge_id UUID REFERENCES forges(id) ON DELETE CASCADE NOT NULL,
  repo_id UUID REFERENCES linked_repos(id) ON DELETE CASCADE NOT NULL,
  pr_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  state TEXT DEFAULT 'open' NOT NULL,
  author TEXT NOT NULL,
  pr_url TEXT NOT NULL,
  related_issue_numbers INTEGER[] DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Activity events table
CREATE TABLE activity_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  forge_id UUID REFERENCES forges(id) ON DELETE CASCADE NOT NULL,
  repo_id UUID REFERENCES linked_repos(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  actor TEXT NOT NULL,
  source_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX idx_unified_issues_forge_id ON unified_issues(forge_id);
CREATE INDEX idx_pr_activity_forge_id ON pr_activity(forge_id);
CREATE INDEX idx_activity_events_forge_id ON activity_events(forge_id);
CREATE INDEX idx_activity_events_created_at ON activity_events(created_at DESC);
