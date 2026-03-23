-- GitHub accounts table
CREATE TABLE github_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  github_user_id INTEGER NOT NULL,
  github_login TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Linked repositories table
CREATE TABLE linked_repos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  forge_id UUID REFERENCES forges(id) ON DELETE CASCADE NOT NULL,
  github_account_id UUID REFERENCES github_accounts(id) ON DELETE CASCADE NOT NULL,
  github_repo_full_name TEXT NOT NULL,
  github_repo_id INTEGER NOT NULL,
  default_branch TEXT DEFAULT 'main' NOT NULL,
  private BOOLEAN DEFAULT FALSE NOT NULL,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE (forge_id, github_repo_full_name)
);

-- Indexes
CREATE INDEX idx_linked_repos_forge_id ON linked_repos(forge_id);
CREATE INDEX idx_linked_repos_github_repo_full_name ON linked_repos(github_repo_full_name);
