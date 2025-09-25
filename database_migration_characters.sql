-- Characters table migration
-- Run this SQL in your Supabase SQL editor

-- Create characters table
CREATE TABLE IF NOT EXISTS characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  edit_prompt TEXT,
  
  -- R2 asset references (following backend.mdc conventions)
  image_url TEXT, -- R2 public URL for display
  image_key TEXT, -- R2 object key for deletion/management
  image_size INTEGER, -- File size in bytes
  image_content_type TEXT, -- MIME type
  
  -- Original reference image (for image-to-image generation)
  original_image_url TEXT,
  original_image_key TEXT,
  original_image_size INTEGER,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS characters_user_id_idx ON characters(user_id);
CREATE INDEX IF NOT EXISTS characters_project_id_idx ON characters(project_id);
CREATE INDEX IF NOT EXISTS characters_created_at_idx ON characters(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE characters ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own characters
CREATE POLICY "Users can view their own characters" 
  ON characters FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own characters" 
  ON characters FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own characters" 
  ON characters FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own characters" 
  ON characters FOR DELETE 
  USING (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at
CREATE TRIGGER update_characters_updated_at 
  BEFORE UPDATE ON characters 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Optional: Add some helpful comments
COMMENT ON TABLE characters IS 'Character definitions with R2 asset references';
COMMENT ON COLUMN characters.image_url IS 'Public R2 URL for character image display';
COMMENT ON COLUMN characters.image_key IS 'R2 object key for asset management and cleanup';
COMMENT ON COLUMN characters.project_id IS 'Optional project association for organization';
