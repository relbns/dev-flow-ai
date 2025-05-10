-- Make the name column nullable in the scoped_paths table
ALTER TABLE scoped_paths
ALTER COLUMN name DROP NOT NULL;
