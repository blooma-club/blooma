-- Comprehensive diagnosis script for projects fetching issue
-- Run this script to identify the root cause of the dashboard projects issue

-- 1. Check if projects table exists and its structure
SELECT '1. Projects table structure:' as section;
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'projects'
ORDER BY ordinal_position;

-- 2. Check if RLS is enabled on projects table
SELECT '2. RLS status on projects table:' as section;
SELECT 
  schemaname, 
  tablename, 
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'projects' 
  AND schemaname = 'public';

-- 3. Check existing RLS policies for projects table
SELECT '3. Existing RLS policies for projects:' as section;
SELECT 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'projects' 
  AND schemaname = 'public';

-- 4. Check if users table exists and has the correct structure
SELECT '4. Users table structure:' as section;
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'users'
ORDER BY ordinal_position;

-- 5. Check RLS status on users table
SELECT '5. RLS status on users table:' as section;
SELECT 
  schemaname, 
  tablename, 
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'users' 
  AND schemaname = 'public';

-- 6. Check existing RLS policies for users table
SELECT '6. Existing RLS policies for users:' as section;
SELECT 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'users' 
  AND schemaname = 'public';

-- 7. Check auth.users vs public.users mismatch
SELECT '7. Auth users without public profiles:' as section;
SELECT 
  au.id, 
  au.email,
  au.created_at as auth_created,
  pu.id as public_user_id,
  pu.created_at as public_created
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE au.deleted_at IS NULL
ORDER BY au.created_at;

-- 8. Check if there are any projects in the database
SELECT '8. Existing projects count:' as section;
SELECT 
  COUNT(*) as total_projects,
  COUNT(DISTINCT user_id) as unique_users_with_projects
FROM public.projects;

-- 9. Check projects by user (if any exist)
SELECT '9. Projects by user:' as section;
SELECT 
  p.user_id,
  au.email,
  COUNT(*) as project_count,
  MIN(p.created_at) as first_project,
  MAX(p.created_at) as last_project
FROM public.projects p
LEFT JOIN auth.users au ON p.user_id = au.id
GROUP BY p.user_id, au.email
ORDER BY project_count DESC;

-- 10. Check permissions
SELECT '10. Table permissions:' as section;
SELECT 
  grantee, 
  table_name, 
  privilege_type
FROM information_schema.table_privileges 
WHERE table_schema = 'public' 
  AND table_name IN ('projects', 'users')
ORDER BY table_name, grantee, privilege_type;

-- Summary
SELECT 'DIAGNOSIS SUMMARY:' as section;
SELECT 
  CASE 
    WHEN NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'projects' AND table_schema = 'public')
    THEN '❌ Projects table does not exist'
    WHEN NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'projects' AND schemaname = 'public' AND rowsecurity = true)
    THEN '❌ Projects table exists but RLS is not enabled'
    WHEN NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'projects' AND schemaname = 'public')
    THEN '❌ Projects table has RLS enabled but no policies exist'
    WHEN EXISTS (SELECT 1 FROM auth.users au LEFT JOIN public.users pu ON au.id = pu.id WHERE pu.id IS NULL AND au.deleted_at IS NULL)
    THEN '❌ Some auth users do not have public.user profiles'
    ELSE '✅ Database structure appears correct - issue may be in application logic'
  END as diagnosis;
