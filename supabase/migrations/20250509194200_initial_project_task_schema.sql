-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Projects Table
CREATE TABLE projects (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    github_repo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Scoped Paths Table (represents components/modules within a project's repo)
CREATE TABLE scoped_paths (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL, -- e.g., "Frontend App", "Shared Utilities"
    path_in_repo TEXT NOT NULL, -- e.g., "/apps/frontend", "/packages/utils"
    notes TEXT, -- Specific instructions/conventions for this path
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tasks Table
CREATE TABLE tasks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
    scoped_path_id UUID REFERENCES scoped_paths(id) ON DELETE SET NULL, -- Task can be associated with a specific scoped path
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'Backlog' NOT NULL, -- e.g., Backlog, To Do, In Progress, In Review, Done
    current_branch TEXT,
    pull_request_url TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Function to update 'updated_at' column
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to automatically update 'updated_at' on table updates
CREATE TRIGGER set_projects_updated_at
BEFORE UPDATE ON projects
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_scoped_paths_updated_at
BEFORE UPDATE ON scoped_paths
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_tasks_updated_at
BEFORE UPDATE ON tasks
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- Enable Row Level Security (RLS) for the tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE scoped_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for 'projects'
-- Users can see their own projects
CREATE POLICY "Allow individual read access to own projects" ON projects
FOR SELECT USING (auth.uid() = user_id);
-- Users can insert their own projects
CREATE POLICY "Allow individual insert access to own projects" ON projects
FOR INSERT WITH CHECK (auth.uid() = user_id);
-- Users can update their own projects
CREATE POLICY "Allow individual update access to own projects" ON projects
FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
-- Users can delete their own projects
CREATE POLICY "Allow individual delete access to own projects" ON projects
FOR DELETE USING (auth.uid() = user_id);


-- RLS Policies for 'scoped_paths'
-- Users can manage scoped_paths for projects they own
CREATE POLICY "Allow full access to scoped_paths for project owners" ON scoped_paths
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = scoped_paths.project_id AND projects.user_id = auth.uid()
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = scoped_paths.project_id AND projects.user_id = auth.uid()
  )
);

-- RLS Policies for 'tasks'
-- Users can manage tasks for projects they own
CREATE POLICY "Allow full access to tasks for project owners" ON tasks
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = tasks.project_id AND projects.user_id = auth.uid()
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = tasks.project_id AND projects.user_id = auth.uid()
  )
);
