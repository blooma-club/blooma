-- Complete database migration for Users and Credits system
-- This script creates all necessary tables for the credits system

-- Create users table (extends Supabase auth.users with additional fields)
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

-- Create ai_usage table for tracking AI operations
CREATE TABLE IF NOT EXISTS public.ai_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  operation_type TEXT NOT NULL CHECK (operation_type IN ('text_generation', 'image_generation', 'script_generation', 'image_edit')),
  provider TEXT NOT NULL,
  model_name TEXT,
  credits_consumed INTEGER NOT NULL DEFAULT 0,
  input_tokens INTEGER,
  output_tokens INTEGER,
  image_count INTEGER,
  success BOOLEAN DEFAULT true NOT NULL,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create credit_transactions table for transaction history
CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('usage', 'purchase', 'refund', 'bonus', 'reset')),
  amount INTEGER NOT NULL, -- Positive for additions, negative for usage
  description TEXT NOT NULL,
  ai_usage_id UUID REFERENCES public.ai_usage(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_subscription_tier ON public.users(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_users_credits_reset_date ON public.users(credits_reset_date);
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_id ON public.ai_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_created_at ON public.ai_usage(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_usage_operation_type ON public.ai_usage(operation_type);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON public.credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON public.credit_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_type ON public.credit_transactions(type);

-- Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for users table
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Create RLS policies for ai_usage table
CREATE POLICY "Users can view own AI usage" ON public.ai_usage
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own AI usage" ON public.ai_usage
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for credit_transactions table
CREATE POLICY "Users can view own credit transactions" ON public.credit_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own credit transactions" ON public.credit_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create function to automatically create user profile when auth user is created
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

-- Create trigger to automatically create user profile
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE public.users IS 'User profiles with credits and subscription information';
COMMENT ON COLUMN public.users.credits IS 'Available credits for AI operations';
COMMENT ON COLUMN public.users.credits_used IS 'Credits used in current billing period';
COMMENT ON COLUMN public.users.credits_reset_date IS 'Date when credits will be reset (monthly)';
COMMENT ON COLUMN public.users.subscription_tier IS 'User subscription tier: basic, pro, or enterprise';

COMMENT ON TABLE public.ai_usage IS 'Records of AI operations and credit consumption';
COMMENT ON COLUMN public.ai_usage.operation_type IS 'Type of AI operation performed';
COMMENT ON COLUMN public.ai_usage.credits_consumed IS 'Number of credits consumed for this operation';

COMMENT ON TABLE public.credit_transactions IS 'History of all credit transactions (usage, purchases, etc.)';
COMMENT ON COLUMN public.credit_transactions.amount IS 'Credit amount: positive for additions, negative for usage';

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.users TO anon, authenticated;
GRANT ALL ON public.ai_usage TO anon, authenticated;
GRANT ALL ON public.credit_transactions TO anon, authenticated;

-- Update the schema cache
NOTIFY pgrst, 'reload schema';
