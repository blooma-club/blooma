-- Complete database migration for Blooma
-- This script ensures all required fields exist and are properly configured

-- Add missing columns to cards table if they don't exist
ALTER TABLE cards 
ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS scene_number INTEGER,
ADD COLUMN IF NOT EXISTS shot_description TEXT,
ADD COLUMN IF NOT EXISTS shot_type TEXT,
ADD COLUMN IF NOT EXISTS angle TEXT,
ADD COLUMN IF NOT EXISTS background TEXT,
ADD COLUMN IF NOT EXISTS mood_lighting TEXT,
ADD COLUMN IF NOT EXISTS dialogue TEXT,
ADD COLUMN IF NOT EXISTS sound TEXT,
ADD COLUMN IF NOT EXISTS image_prompt TEXT,
ADD COLUMN IF NOT EXISTS storyboard_status TEXT DEFAULT 'ready';

-- Add timeline columns if they don't exist (from previous migration)
ALTER TABLE cards 
ADD COLUMN IF NOT EXISTS duration DECIMAL(5,2) DEFAULT 3.0,
ADD COLUMN IF NOT EXISTS audio_url TEXT,
ADD COLUMN IF NOT EXISTS voice_over_url TEXT, 
ADD COLUMN IF NOT EXISTS voice_over_text TEXT,
ADD COLUMN IF NOT EXISTS start_time DECIMAL(10,2) DEFAULT 0.0;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_cards_order_index ON cards(order_index);
CREATE INDEX IF NOT EXISTS idx_cards_scene_number ON cards(scene_number);
CREATE INDEX IF NOT EXISTS idx_cards_storyboard_status ON cards(storyboard_status);

-- Add comments for documentation
COMMENT ON COLUMN cards.order_index IS 'Position of the card within the storyboard';
COMMENT ON COLUMN cards.image_url IS 'Single image URL (preferred over image_urls array)';
COMMENT ON COLUMN cards.scene_number IS 'Scene number for display purposes';
COMMENT ON COLUMN cards.shot_description IS 'Description of what happens in this shot';
COMMENT ON COLUMN cards.storyboard_status IS 'Status of image generation: pending, enhancing, prompted, generating, ready, error';

-- Ensure all existing cards have proper order_index values
WITH ordered_cards AS (
  SELECT id, storyboard_id, ROW_NUMBER() OVER (PARTITION BY storyboard_id ORDER BY created_at) - 1 as new_order
  FROM cards 
  WHERE order_index IS NULL
)
UPDATE cards 
SET order_index = ordered_cards.new_order,
    scene_number = ordered_cards.new_order + 1
FROM ordered_cards 
WHERE cards.id = ordered_cards.id;

-- Update the schema cache
NOTIFY pgrst, 'reload schema';