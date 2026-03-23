-- Add columns to unified_issues
ALTER TABLE unified_issues ADD COLUMN IF NOT EXISTS position NUMERIC NOT NULL DEFAULT 1000;
ALTER TABLE unified_issues ADD COLUMN IF NOT EXISTS source_repo_name TEXT;
ALTER TABLE unified_issues ADD COLUMN IF NOT EXISTS issue_type TEXT NOT NULL DEFAULT 'issue';
ALTER TABLE unified_issues ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add check constraint for issue_type
ALTER TABLE unified_issues DROP CONSTRAINT IF EXISTS check_issue_type;
ALTER TABLE unified_issues ADD CONSTRAINT check_issue_type CHECK (issue_type IN ('issue', 'task', 'bug', 'feature'));

-- Create index for board queries
CREATE INDEX IF NOT EXISTS idx_unified_issues_forge_status_position ON unified_issues(forge_id, status, position);

-- Add columns to pr_activity
ALTER TABLE pr_activity ADD COLUMN IF NOT EXISTS mergeable_state TEXT;
ALTER TABLE pr_activity ADD COLUMN IF NOT EXISTS head_ref TEXT;
ALTER TABLE pr_activity ADD COLUMN IF NOT EXISTS base_ref TEXT;
