-- Profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Forges table
CREATE TABLE forges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived')) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Forge members table
CREATE TABLE forge_members (
  forge_id UUID REFERENCES forges(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'member', 'viewer')) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  PRIMARY KEY (forge_id, user_id)
);

-- Forge milestones table
CREATE TABLE forge_milestones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  forge_id UUID REFERENCES forges(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  due_date TIMESTAMPTZ,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX idx_forges_owner_id ON forges(owner_id);
CREATE INDEX idx_forge_members_user_id ON forge_members(user_id);
CREATE INDEX idx_forge_milestones_forge_id ON forge_milestones(forge_id);
