-- Populate public.users table from existing auth.users data
-- This script creates user profiles for all your existing auth users

-- First, ensure the public.users table exists with the correct schema
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

-- Enable RLS on users table
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

-- Insert user profiles for all your existing auth users
INSERT INTO public.users (id, email, name, avatar_url, created_at)
VALUES 
  (
    '03298237-819c-431c-8efe-c25dc0ae49de',
    'contact@blooma.club',
    'contact blooma',
    'https://lh3.googleusercontent.com/a/ACg8ocJ8J6-1COIZPAPEBh_G7oW4VU7oR1FR4dHiHckZmAuq_rM6uw=s96-c',
    '2025-07-30 05:38:44.066905+00'
  ),
  (
    'e12c5ecf-2806-46fd-acfb-704997e5d636',
    'buza0605@gmail.com',
    'elz',
    'https://lh3.googleusercontent.com/a/ACg8ocJutbCSyTRuU26YZvDyNzo9MSXupLi3ZBrPnpgicHaEyXBVrlDE=s96-c',
    '2025-07-30 00:29:35.338162+00'
  ),
  (
    '9731488f-3754-436c-8180-458efc9d9a74',
    'teddio496@gmail.com',
    'Teddy Heo',
    'https://lh3.googleusercontent.com/a/ACg8ocJ6uu9rXIfBj7fNAMwAYP_Ke1whaP8OBaNlvhVCk2G6FkaSkSSl=s96-c',
    '2025-07-30 21:25:13.989101+00'
  ),
  (
    '091118a1-052f-467f-a3c2-a62dc655f0c0',
    'dasarom4@gmail.com',
    'Lee Ys',
    'https://lh3.googleusercontent.com/a/ACg8ocLbk8oUkOYRkbeaIeImK3Jh5HUj12seuo02Bu1eCBl0-kP_Ew=s96-c',
    '2025-08-02 17:52:27.652574+00'
  );

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.users TO anon, authenticated;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- Create trigger for automatic user profile creation (for future signups)
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

-- Drop existing trigger to avoid conflicts
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger for future user signups
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update schema cache
NOTIFY pgrst, 'reload schema';

-- Verify the users were created
SELECT 'SUCCESS: User profiles created!' as status;
SELECT 
  id, 
  email, 
  name, 
  avatar_url,
  credits,
  subscription_tier,
  created_at
FROM public.users 
ORDER BY created_at;

-- Show summary
SELECT 
  'Total users in public.users:' as description,
  COUNT(*) as count
FROM public.users;
