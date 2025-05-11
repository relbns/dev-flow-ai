-- Add columns to projects table for GitHub organization association
ALTER TABLE public.projects
ADD COLUMN github_org_id BIGINT,
ADD COLUMN github_org_login TEXT;

-- Optional: Add an index for faster lookups if you query by org often
CREATE INDEX IF NOT EXISTS idx_projects_github_org_id ON public.projects(github_org_id);
CREATE INDEX IF NOT EXISTS idx_projects_github_org_login ON public.projects(github_org_login);

-- RLS policies for projects might need to be reviewed if org-level access is introduced later,
-- but for now, existing user_id based RLS should still apply correctly.
-- If a user is part of an org, they still "own" the project record via user_id.
-- Org-based visibility for other org members would be a more complex RLS change.
