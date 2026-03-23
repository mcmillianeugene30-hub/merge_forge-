-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE forges ENABLE ROW LEVEL SECURITY;
ALTER TABLE forge_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE forge_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE github_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE linked_repos ENABLE ROW LEVEL SECURITY;
ALTER TABLE unified_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE pr_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_events ENABLE ROW LEVEL SECURITY;

-- Helper function: is forge member
CREATE OR REPLACE FUNCTION is_forge_member(p_forge_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM forge_members
    WHERE forge_id = p_forge_id AND user_id = auth.uid()
  );
$$ LANGUAGE sql STABLE;

-- Helper function: is forge owner
CREATE OR REPLACE FUNCTION is_forge_owner(p_forge_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM forges
    WHERE id = p_forge_id AND owner_id = auth.uid()
  );
$$ LANGUAGE sql STABLE;

-- Profiles policies
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (id = auth.uid());

-- Forges policies
CREATE POLICY "forges_select" ON forges FOR SELECT USING (is_forge_member(id));
CREATE POLICY "forges_insert" ON forges FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "forges_update" ON forges FOR UPDATE USING (is_forge_owner(id));
CREATE POLICY "forges_delete" ON forges FOR DELETE USING (is_forge_owner(id));

-- Forge members policies
CREATE POLICY "forge_members_select" ON forge_members FOR SELECT USING (is_forge_member(forge_id));
CREATE POLICY "forge_members_insert" ON forge_members FOR INSERT WITH CHECK (is_forge_owner(forge_id));
CREATE POLICY "forge_members_update" ON forge_members FOR UPDATE USING (is_forge_owner(forge_id));
CREATE POLICY "forge_members_delete" ON forge_members FOR DELETE USING (is_forge_owner(forge_id));

-- Forge milestones policies
CREATE POLICY "forge_milestones_select" ON forge_milestones FOR SELECT USING (is_forge_member(forge_id));
CREATE POLICY "forge_milestones_all" ON forge_milestones FOR ALL USING (is_forge_member(forge_id));

-- GitHub accounts policies
CREATE POLICY "github_accounts_select" ON github_accounts FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "github_accounts_all" ON github_accounts FOR ALL USING (user_id = auth.uid());

-- Linked repos policies
CREATE POLICY "linked_repos_select" ON linked_repos FOR SELECT USING (is_forge_member(forge_id));
CREATE POLICY "linked_repos_all" ON linked_repos FOR ALL USING (is_forge_member(forge_id));

-- Unified issues policies
CREATE POLICY "unified_issues_select" ON unified_issues FOR SELECT USING (is_forge_member(forge_id));
CREATE POLICY "unified_issues_all" ON unified_issues FOR ALL USING (is_forge_member(forge_id));

-- PR activity policies
CREATE POLICY "pr_activity_select" ON pr_activity FOR SELECT USING (is_forge_member(forge_id));
CREATE POLICY "pr_activity_all" ON pr_activity FOR ALL USING (is_forge_member(forge_id));

-- Activity events policies
CREATE POLICY "activity_events_select" ON activity_events FOR SELECT USING (is_forge_member(forge_id));
CREATE POLICY "activity_events_all" ON activity_events FOR ALL USING (is_forge_member(forge_id));
