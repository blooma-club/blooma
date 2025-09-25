-- Complete fix for user profile and credits system
-- Run this script in your Supabase SQL Editor

-- Step 1: Check if your user exists in auth.users
-- Replace 'your-email@example.com' with your actual email address
SELECT 
  id, 
  email, 
  created_at,
  raw_user_meta_data
FROM auth.users 
WHERE email = 'your-email@example.com';

-- Step 2: Create user profile (replace the values with your actual data)
-- Get the ID from Step 1 and use it here
INSERT INTO public.users (
  id, 
  email, 
  name, 
  avatar_url,
  credits, 
  subscription_tier
) VALUES (
  'e12c5ecf-2806-46fd-acfb-704997e5d636', -- Your user ID from the terminal output
  'your-email@example.com', -- Replace with your actual email
  'Your Name', -- Replace with your actual name
  NULL, -- Avatar URL (optional)
  100, -- Starting credits
  'basic' -- Default subscription tier
) ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  updated_at = NOW();

-- Step 3: Verify the user profile was created
SELECT 
  id, 
  email, 
  name, 
  credits, 
  subscription_tier, 
  created_at,
  updated_at
FROM public.users 
WHERE id = 'e12c5ecf-2806-46fd-acfb-704997e5d636';

-- Step 4: Check if you have any existing projects
SELECT 
  id,
  title,
  description,
  created_at
FROM public.projects 
WHERE user_id = 'e12c5ecf-2806-46fd-acfb-704997e5d636';

-- Step 5: If you want to create a test project, uncomment and run this:
/*
INSERT INTO public.projects (
  id,
  user_id,
  title,
  description,
  is_public
) VALUES (
  gen_random_uuid(),
  'e12c5ecf-2806-46fd-acfb-704997e5d636',
  'My First Project',
  'A test project to verify the system is working',
  false
);
*/
