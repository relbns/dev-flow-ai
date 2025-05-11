-- Table to store project members and their roles
CREATE TABLE public.project_members (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Link to an existing DevFlow AI user, if applicable
    
    -- Store GitHub user info if not a DevFlow AI user or for reference
    github_user_id BIGINT,
    github_username TEXT,
    
    name_override TEXT, -- Display name for this project context
    avatar_url_override TEXT, -- Display avatar for this project context
    
    role TEXT NOT NULL CHECK (role IN ('Project Lead', 'Developer', 'Designer', 'QA', 'Stakeholder', 'Viewer')), -- Define allowed roles
    
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,

    -- Ensure a member is unique per project (either by user_id or by github_username if no user_id)
    CONSTRAINT unique_project_user UNIQUE (project_id, user_id),
    CONSTRAINT unique_project_github_user UNIQUE (project_id, github_username) 
      DEFERRABLE INITIALLY DEFERRED -- Allows temporary nulls during multi-step adds if needed, but enforces if both are set
);

-- Add indexes for common lookups
CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON public.project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON public.project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_project_members_github_username ON public.project_members(github_username);
CREATE INDEX IF NOT EXISTS idx_project_members_role ON public.project_members(role);


-- Trigger to update 'updated_at' timestamp
CREATE TRIGGER set_project_members_updated_at
BEFORE UPDATE ON public.project_members
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp(); -- Assumes trigger_set_timestamp function exists

-- Enable Row Level Security
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for 'project_members'
-- Allow project owners (creators of the project in 'projects' table) to manage members for their projects
CREATE POLICY "Allow full management of project members by project owner"
ON public.project_members
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id = project_members.project_id AND p.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id = project_members.project_id AND p.user_id = auth.uid()
  )
);

-- Allow authenticated users to view members of projects they are also a member of (indirectly via project ownership for now)
-- More granular RLS (e.g., project members can see other members) can be added later if needed.
-- For now, only project owners can see members. If a user is a member but not the project owner,
-- they wouldn't see other members via this policy alone.
-- This simple policy relies on the frontend to fetch members if the current user is the project owner.
CREATE POLICY "Allow project owners to read their project members"
ON public.project_members
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id = project_members.project_id AND p.user_id = auth.uid()
  )
);

-- Note: The unique constraints `unique_project_user` and `unique_project_github_user` might need adjustment.
-- If a user is invited via GitHub username and later signs up to DevFlow AI, we'd want to link their
-- user_id to the existing project_member entry. This might require relaxing the constraint or an upsert logic.
-- For now, `DEFERRABLE INITIALLY DEFERRED` on `unique_project_github_user` provides some flexibility.
-- A better approach might be a single unique constraint on (project_id, COALESCE(user_id::text, github_username)).
-- Let's keep it as is for now and refine if needed.
