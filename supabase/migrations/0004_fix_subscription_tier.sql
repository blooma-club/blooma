ALTER TABLE public.users
  ALTER COLUMN subscription_tier SET DEFAULT 'free';

ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_subscription_tier_check;

ALTER TABLE public.users
  ADD CONSTRAINT users_subscription_tier_check
  CHECK (
    subscription_tier IS NULL OR subscription_tier IN (
      'free',
      'Small Brands',
      'Agency',
      'Studio',
      'basic',
      'pro',
      'enterprise'
    )
  );
