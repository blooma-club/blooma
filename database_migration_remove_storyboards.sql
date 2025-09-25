-- Migration to remove storyboards table and update cards table
-- This script removes the intermediate storyboards table since projects and cards are directly connected
-- Run this SQL in your Supabase SQL editor

-- Step 1: Remove the foreign key constraint from cards to storyboards
ALTER TABLE cards DROP CONSTRAINT IF EXISTS cards_storyboard_id_fkey;

-- Step 2: Remove the storyboard_id column from cards table
ALTER TABLE cards DROP COLUMN IF EXISTS storyboard_id;

-- Step 3: Drop the storyboards table completely
DROP TABLE IF EXISTS storyboards CASCADE;

-- Step 4: Ensure project_id is properly indexed in cards table (should already exist)
CREATE INDEX IF NOT EXISTS idx_cards_project_id ON cards(project_id);

-- Step 5: Update any existing data integrity (optional cleanup)
-- Remove any orphaned cards that don't have a valid project_id
DELETE FROM cards WHERE project_id IS NULL OR project_id NOT IN (SELECT id FROM projects);

-- Step 6: Add helpful comments
COMMENT ON TABLE cards IS 'Cards table directly connected to projects without intermediate storyboards table';
COMMENT ON COLUMN cards.project_id IS 'Direct reference to project - replaces storyboard_id relationship';

-- Step 7: Update the database schema cache (Supabase specific)
NOTIFY pgrst, 'reload schema';
