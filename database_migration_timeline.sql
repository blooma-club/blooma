-- Database migration to add timeline-related columns to the cards table
-- This migration adds support for timeline editor functionality

-- Add timeline-related columns to the cards table
ALTER TABLE cards 
ADD COLUMN IF NOT EXISTS duration DECIMAL(5,2) DEFAULT 3.0,
ADD COLUMN IF NOT EXISTS audio_url TEXT,
ADD COLUMN IF NOT EXISTS voice_over_url TEXT, 
ADD COLUMN IF NOT EXISTS voice_over_text TEXT,
ADD COLUMN IF NOT EXISTS start_time DECIMAL(10,2) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS video_url TEXT,
ADD COLUMN IF NOT EXISTS video_key TEXT,
ADD COLUMN IF NOT EXISTS video_prompt TEXT;

-- Store preferred storyboard card width (pixels)
ALTER TABLE cards 
ADD COLUMN IF NOT EXISTS card_width INTEGER;

-- Add comments for documentation
COMMENT ON COLUMN cards.duration IS 'Duration of the scene in seconds (default: 3.0)';
COMMENT ON COLUMN cards.audio_url IS 'URL to background audio/music file for this scene';
COMMENT ON COLUMN cards.voice_over_url IS 'URL to voice-over audio file for this scene';
COMMENT ON COLUMN cards.voice_over_text IS 'Script text for voice-over narration';
COMMENT ON COLUMN cards.start_time IS 'Start time of the scene in the timeline (seconds)';
COMMENT ON COLUMN cards.video_url IS 'URL to generated storyboard video clip';
COMMENT ON COLUMN cards.video_key IS 'Cloudflare R2 object key for the generated video clip';
COMMENT ON COLUMN cards.video_prompt IS 'Prompt text used to generate the storyboard video clip';
COMMENT ON COLUMN cards.card_width IS 'Preferred storyboard card width in pixels';

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_cards_duration ON cards(duration);
CREATE INDEX IF NOT EXISTS idx_cards_start_time ON cards(start_time);

-- Update the database schema cache (Supabase specific)
NOTIFY pgrst, 'reload schema';
