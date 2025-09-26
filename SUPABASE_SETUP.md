# Supabase Setup for Blooma

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click "Start your project"
3. Sign up with GitHub or email
4. Click "New Project"
5. Fill in:
   - **Name**: `blooma-app`
   - **Database Password**: Generate strong password (save it!)
   - **Region**: Choose closest to you
   - **Plan**: Free
6. Click "Create new project"
7. Wait 2-3 minutes for setup

## Step 2: Get Your Credentials

1. In your new project dashboard, go to **Settings** → **API**
2. Copy these two values:
   - **Project URL** (example: `https://abcdefgh.supabase.co`)
   - **anon public** key (long string starting with `eyJ`)

## Step 3: Create Environment File

Create `.env.local` in your project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

**Replace with your actual values from Step 2!**

## Step 4: Create Database Tables

In Supabase dashboard, go to **SQL Editor** and run this script:

```sql
-- Users table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Projects table
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Storyboards table
CREATE TABLE IF NOT EXISTS public.storyboards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  project_id UUID REFERENCES public.projects,
  title TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Cards table with timeline support
CREATE TABLE IF NOT EXISTS public.cards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  storyboard_id UUID REFERENCES public.storyboards NOT NULL,
  user_id UUID REFERENCES auth.users NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('scene', 'card')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  user_input TEXT,

  -- Image fields
  image_url TEXT,
  image_urls TEXT[],
  selected_image_url INTEGER DEFAULT 0,
  image_key TEXT,
  image_size INTEGER,
  image_type TEXT,

  -- Positioning
  order_index INTEGER NOT NULL DEFAULT 0,
  next_card_id UUID REFERENCES public.cards,
  prev_card_id UUID REFERENCES public.cards,

  -- Storyboard metadata
  scene_number INTEGER,
  shot_type TEXT,
  angle TEXT,
  background TEXT,
  mood_lighting TEXT,
  dialogue TEXT,
  sound TEXT,
  image_prompt TEXT,
  storyboard_status TEXT,
  shot_description TEXT,

  -- Timeline fields (fixes the database error!)
  duration DECIMAL(5,2) DEFAULT 3.0,
  audio_url TEXT,
  voice_over_url TEXT,
  voice_over_text TEXT,
  start_time DECIMAL(10,2) DEFAULT 0.0,
  video_url TEXT,
  video_key TEXT,
  video_prompt TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_storyboards_user_id ON public.storyboards(user_id);
CREATE INDEX IF NOT EXISTS idx_storyboards_project_id ON public.storyboards(project_id);
CREATE INDEX IF NOT EXISTS idx_cards_storyboard_id ON public.cards(storyboard_id);
CREATE INDEX IF NOT EXISTS idx_cards_user_id ON public.cards(user_id);
CREATE INDEX IF NOT EXISTS idx_cards_order_index ON public.cards(order_index);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storyboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;

-- Security policies
CREATE POLICY "Users can manage own data" ON public.users USING (auth.uid() = id);
CREATE POLICY "Users can manage own projects" ON public.projects USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own storyboards" ON public.storyboards USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own cards" ON public.cards USING (auth.uid() = user_id);

-- Auto-create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, display_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'display_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
```

## Step 5: Test Your Setup

```bash
# Start your app
npm run dev

# Open http://localhost:3000
```

You should now be able to:

- ✅ Load the app without Supabase errors
- ✅ Sign up/sign in with email
- ✅ Create projects and storyboards
- ✅ Use the timeline editor without database errors

## Optional: Enable Google OAuth

1. In Supabase dashboard: **Authentication** → **Providers**
2. Enable Google
3. Follow Google OAuth setup instructions
4. Add your Google Client ID and Secret

## Troubleshooting

**"Supabase 환경 변수가 누락되었습니다" error:**

- Check `.env.local` exists and has correct variable names
- Restart your dev server after adding environment variables

**Database errors:**

- Verify the SQL script ran without errors in Supabase
- Check that all tables were created in **Table Editor**

**Timeline errors:**

- Make sure the timeline columns (`duration`, `audio_url`, `voice_over_url`, `start_time`, `video_url`, `video_key`, `video_prompt`, etc.) exist in the `cards` table
- These are included in the SQL script above

That's it! Your Supabase setup is complete and the timeline error should be fixed.
