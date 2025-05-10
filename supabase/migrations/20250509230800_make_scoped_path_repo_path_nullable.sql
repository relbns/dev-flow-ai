-- Make the path_in_repo column nullable in the scoped_paths table
ALTER TABLE scoped_paths
ALTER COLUMN path_in_repo DROP NOT NULL;
