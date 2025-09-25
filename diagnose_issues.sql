-- Comprehensive diagnostic script for Blooma issues
-- Run this in your Supabase SQL Editor to diagnose problems

-- ========================================
-- 1. CHECK AUTHENTICATION STATUS
-- ========================================
SELECT 'AUTH USERS' as check_type, count(*) as count FROM auth.users;

-- Check your specific user
SELECT 
  'YOUR USER' as check_type,
  id, 
  email, 
  created_at,
  email_confirmed_at,
  last_sign_in_at
FROM auth.users 
WHERE id = 'e12c5ecf-2806-46fd-acfb-704997e5d636';

-- ========================================
-- 2. CHECK USER PROFILE
-- ========================================
SELECT 'USER PROFILES' as check_type, count(*) as count FROM public.users;

-- Check if your user profile exists
SELECT 
  'YOUR PROFILE' as check_type,
  id, 
  email, 
  name, 
  credits, 
  subscription_tier,
  created_at
FROM public.users 
WHERE id = 'e12c5ecf-2806-46fd-acfb-704997e5d636';

-- ========================================
-- 3. CHECK PROJECTS TABLE
-- ========================================
SELECT 'PROJECTS TABLE' as check_type, count(*) as count FROM public.projects;

-- Check your projects
SELECT 
  'YOUR PROJECTS' as check_type,
  id,
  title,
  description,
  user_id,
  created_at
FROM public.projects 
WHERE user_id = 'e12c5ecf-2806-46fd-acfb-704997e5d636';

-- ========================================
-- 4. CHECK CARDS TABLE
-- ========================================
SELECT 'CARDS TABLE' as check_type, count(*) as count FROM public.cards;

-- Check your cards
SELECT 
  'YOUR CARDS' as check_type,
  id,
  project_id,
  title,
  type,
  created_at
FROM public.cards 
WHERE user_id = 'e12c5ecf-2806-46fd-acfb-704997e5d636';

-- ========================================
-- 5. CHECK CREDITS TABLES
-- ========================================
SELECT 'AI USAGE' as check_type, count(*) as count FROM public.ai_usage;
SELECT 'CREDIT TRANSACTIONS' as check_type, count(*) as count FROM public.credit_transactions;

-- ========================================
-- 6. CREATE USER PROFILE IF MISSING
-- ========================================
-- This will create your user profile if it doesn't exist
INSERT INTO public.users (
  id, 
  email, 
  name, 
  credits, 
  subscription_tier
) 
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'name', au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1)),
  100,
  'basic'
FROM auth.users au
WHERE au.id = 'e12c5ecf-2806-46fd-acfb-704997e5d636'
AND NOT EXISTS (
  SELECT 1 FROM public.users pu WHERE pu.id = au.id
);

-- ========================================
-- 7. CREATE TEST PROJECT (OPTIONAL)
-- ========================================
-- Uncomment this section if you want to create a test project
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
  'Test Project',
  'A test project to verify the system is working',
  false
);
*/

-- ========================================
-- 8. FINAL VERIFICATION
-- ========================================
-- Check everything is working
SELECT 
  'FINAL CHECK' as check_type,
  (SELECT count(*) FROM public.users WHERE id = 'e12c5ecf-2806-46fd-acfb-704997e5d636') as user_profile_exists,
  (SELECT count(*) FROM public.projects WHERE user_id = 'e12c5ecf-2806-46fd-acfb-704997e5d636') as project_count,
  (SELECT credits FROM public.users WHERE id = 'e12c5ecf-2806-46fd-acfb-704997e5d636') as user_credits;
