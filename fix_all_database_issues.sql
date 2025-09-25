-- Comprehensive fix script for dashboard projects issue
-- This script addresses all potential database issues that could prevent projects from loading

-- =============================================================================
-- 1. CREATE MISSING TABLES AND SCHEMAS
-- =============================================================================

-- Create users table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  avatar_url TEXT,
  credits INTEGER DEFAULT 100 NOT NULL,
  credits_used INTEGER DEFAULT 0 NOT NULL,
  credits_reset_date TIMESTAMPTZ DEFAULT (DATE_TRUNC('month', NOW()) + INTERVAL '1 month') NOT NULL,
  subscription_tier TEXT DEFAULT 'basic' NOT NULL CHECK (subscription_tier IN ('basic', 'pro', 'enterprise')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create projects table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create cards table if it doesn't exist (referenced in projects API)
CREATE TABLE IF NOT EXISTS public.cards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects,
  user_id UUID REFERENCES auth.users NOT NULL,
  type TEXT DEFAULT 'scene',
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  user_input TEXT,
  image_urls TEXT[],
  selected_image_url INTEGER DEFAULT 0,
  scene_number INTEGER,
  shot_type TEXT,
  angle TEXT,
  background TEXT,
  mood_lighting TEXT,
  dialogue TEXT,
  sound TEXT,
  image_prompt TEXT,
  storyboard_status TEXT,
  duration DECIMAL(5,2) DEFAULT 3.0,
  audio_url TEXT,
  voice_over_url TEXT,
  voice_over_text TEXT,
  start_time DECIMAL(10,2) DEFAULT 0.0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- =============================================================================
-- 2. ENABLE ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.cards ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 3. CREATE RLS POLICIES
-- =============================================================================

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Users can manage own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can view own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can insert own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can update own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can delete own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can view own cards" ON public.cards;
DROP POLICY IF EXISTS "Users can insert own cards" ON public.cards;
DROP POLICY IF EXISTS "Users can update own cards" ON public.cards;
DROP POLICY IF EXISTS "Users can delete own cards" ON public.cards;

-- Create comprehensive RLS policies for users table
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Create comprehensive RLS policies for projects table
CREATE POLICY "Users can view own projects" ON public.projects
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own projects" ON public.projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects" ON public.projects
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects" ON public.projects
  FOR DELETE USING (auth.uid() = user_id);

-- Create comprehensive RLS policies for cards table
CREATE POLICY "Users can view own cards" ON public.cards
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cards" ON public.cards
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cards" ON public.cards
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own cards" ON public.cards
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================================================
-- 4. CREATE INDEXES FOR PERFORMANCE
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON public.projects(created_at);
CREATE INDEX IF NOT EXISTS idx_cards_project_id ON public.cards(project_id);
CREATE INDEX IF NOT EXISTS idx_cards_user_id ON public.cards(user_id);

-- =============================================================================
-- 5. GRANT PERMISSIONS
-- =============================================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.users TO anon, authenticated;
GRANT ALL ON public.projects TO anon, authenticated;
GRANT ALL ON public.cards TO anon, authenticated;

-- =============================================================================
-- 6. CREATE USER PROFILES FOR EXISTING AUTH USERS
-- =============================================================================

-- Insert user profiles for existing auth users who don't have profiles
INSERT INTO public.users (id, email, name, avatar_url)
SELECT 
  au.id,
  au.email,
  COALESCE(
    au.raw_user_meta_data->>'name', 
    au.raw_user_meta_data->>'full_name', 
    split_part(au.email, '@', 1)
  ) as name,
  au.raw_user_meta_data->>'avatar_url' as avatar_url
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
  AND au.deleted_at IS NULL;

-- =============================================================================
-- 7. CREATE TRIGGERS FOR AUTOMATIC USER PROFILE CREATION
-- =============================================================================

-- Create or replace function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create or replace function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers to avoid conflicts
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
DROP TRIGGER IF EXISTS update_projects_updated_at ON public.projects;
DROP TRIGGER IF EXISTS update_cards_updated_at ON public.cards;

-- Create triggers
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cards_updated_at
  BEFORE UPDATE ON public.cards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================================
-- 8. UPDATE SCHEMA CACHE
-- =============================================================================

NOTIFY pgrst, 'reload schema';

-- =============================================================================
-- 9. VERIFICATION QUERIES
-- =============================================================================

-- Show summary of what was created/fixed
SELECT 'FIX SUMMARY:' as section;
SELECT 'Users table:' as table_name, COUNT(*) as record_count FROM public.users
UNION ALL
SELECT 'Projects table:', COUNT(*) FROM public.projects
UNION ALL
SELECT 'Cards table:', COUNT(*) FROM public.cards
UNION ALL
SELECT 'Auth users:', COUNT(*) FROM auth.users WHERE deleted_at IS NULL;

-- Show RLS policies that were created
SELECT 'RLS POLICIES CREATED:' as section;
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  cmd as operation
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('users', 'projects', 'cards')
ORDER BY tablename, policyname;

-- Show any auth users without profiles (should be empty after fix)
SELECT 'AUTH USERS WITHOUT PROFILES (should be empty):' as section;
SELECT COUNT(*) as count
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
  AND au.deleted_at IS NULL;

SELECT '✅ Database fix completed! Try refreshing your dashboard now.' as status;
