-- Task Comments Table
CREATE TABLE task_comments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Can be null if system/AI comment, or if user is deleted
    author_display_name TEXT, -- Could be user's name/email or AI agent's name
    comment_text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL -- Comments are typically immutable, but good to have
);

-- Function to update 'updated_at' column (should already exist from previous migrations)
-- If it doesn't exist for some reason, uncomment and run:
-- CREATE OR REPLACE FUNCTION trigger_set_timestamp()
-- RETURNS TRIGGER AS $$
-- BEGIN
--   NEW.updated_at = timezone('utc'::text, now());
--   RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql;

-- Trigger for task_comments updated_at (if comments are editable, otherwise not strictly needed)
CREATE TRIGGER set_task_comments_updated_at
BEFORE UPDATE ON task_comments
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- Enable Row Level Security (RLS) for task_comments
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for 'task_comments'
-- Users can see comments for tasks in projects they own
CREATE POLICY "Allow read access to comments for task's project owners" ON task_comments
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM tasks t
    JOIN projects p ON t.project_id = p.id
    WHERE t.id = task_comments.task_id AND p.user_id = auth.uid()
  )
);

-- Users can insert comments on tasks in projects they own
-- The user_id in the comment should match the authenticated user, or be NULL for system/AI comments.
CREATE POLICY "Allow insert access to comments for task's project owners" ON task_comments
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM tasks t
    JOIN projects p ON t.project_id = p.id
    WHERE t.id = task_comments.task_id AND p.user_id = auth.uid()
  )
  AND ( 
    (task_comments.user_id IS NULL AND task_comments.author_display_name IS NOT NULL) -- AI/System comment with display name
    OR 
    (task_comments.user_id = auth.uid()) -- User's own comment
  )
);

-- Users can update their own comments (if comments are editable - typically they are not)
CREATE POLICY "Allow update access to own comments" ON task_comments
FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Users can delete their own comments (if comments are deletable)
CREATE POLICY "Allow delete access to own comments" ON task_comments
FOR DELETE USING (auth.uid() = user_id);
