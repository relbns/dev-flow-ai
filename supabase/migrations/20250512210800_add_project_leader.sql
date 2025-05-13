-- Add leader_user_id column to projects table
ALTER TABLE public.projects
ADD COLUMN leader_user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();

-- Update existing projects to set the current user_id as the default leader
-- Note: This assumes the 'user_id' column holds the creator's ID.
-- If existing rows have NULL leader_user_id after the ALTER TABLE, this updates them.
-- The DEFAULT clause only applies to new rows inserted after the ALTER TABLE.
UPDATE public.projects
SET leader_user_id = user_id
WHERE leader_user_id IS NULL;

-- Make the leader_user_id column NOT NULL after populating existing rows
ALTER TABLE public.projects
ALTER COLUMN leader_user_id SET NOT NULL;

-- Add an index for potential lookups by leader
CREATE INDEX IF NOT EXISTS idx_projects_leader_user_id ON public.projects(leader_user_id);

-- RLS Policy Considerations:
-- Ensure existing RLS policies allow users to see projects where they are the leader,
-- or adjust policies as needed. The current policies likely rely on the 'user_id' (creator)
-- column. We might need to update RLS later if leaders need different access than creators.
-- For now, we assume the creator is the initial leader.

-- Example RLS update (if needed later, adjust based on actual requirements):
-- DROP POLICY "Allow individual read access" ON public.projects;
-- CREATE POLICY "Allow individual read access" ON public.projects
-- FOR SELECT USING (auth.uid() = user_id OR auth.uid() = leader_user_id);
