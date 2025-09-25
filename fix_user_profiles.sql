-- Fix user profiles for existing auth.users
-- This script creates user profiles for existing auth users who don't have profiles in public.users

-- First, let's check if the users table exists and has the correct schema
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

-- Enable RLS for users table
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for users table
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;

CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

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

-- Show which users were created
SELECT 'Created profiles for users:' as message;
SELECT id, email, name FROM public.users ORDER BY created_at;

-- Show any remaining auth users without profiles
SELECT 'Auth users without profiles:' as message;
SELECT au.id, au.email 
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
  AND au.deleted_at IS NULL;
