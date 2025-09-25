-- Script to create user profile for existing authenticated user
-- Replace the values below with your actual user information

-- First, check if your user exists in auth.users
SELECT id, email, created_at 
FROM auth.users 
WHERE email = 'your-email@example.com'; -- Replace with your actual email

-- If the user exists in auth.users, create their profile in public.users
-- Replace 'your-user-id-here' with the actual ID from the query above
INSERT INTO public.users (
  id, 
  email, 
  name, 
  credits, 
  subscription_tier
) VALUES (
  'your-user-id-here', -- Replace with actual user ID
  'your-email@example.com', -- Replace with actual email
  'Your Name', -- Replace with actual name
  100, -- Starting credits
  'basic' -- Default subscription tier
) ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  updated_at = NOW();

-- Verify the user profile was created
SELECT id, email, name, credits, subscription_tier, created_at
FROM public.users 
WHERE email = 'your-email@example.com'; -- Replace with your actual email
