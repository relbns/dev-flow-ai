-- Add description column to projects table
ALTER TABLE projects
ADD COLUMN description TEXT;

-- Project Guidelines Table
CREATE TABLE project_guidelines (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
    guideline_text TEXT NOT NULL,
    "order" INTEGER DEFAULT 0 NOT NULL, -- Optional: for ordering multiple guidelines
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Trigger for project_guidelines updated_at
CREATE TRIGGER set_project_guidelines_updated_at
BEFORE UPDATE ON project_guidelines
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp(); -- Uses existing function from previous migration

-- Enable RLS for project_guidelines
ALTER TABLE project_guidelines ENABLE ROW LEVEL SECURITY;

-- RLS Policies for 'project_guidelines'
-- Users can manage guidelines for projects they own
CREATE POLICY "Allow full access to project_guidelines for project owners" ON project_guidelines
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = project_guidelines.project_id AND projects.user_id = auth.uid()
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = project_guidelines.project_id AND projects.user_id = auth.uid()
  )
);
