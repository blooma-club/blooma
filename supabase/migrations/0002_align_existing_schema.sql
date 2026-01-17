-- Align existing Supabase schema with Blooma (Clerk IDs + billing columns)

ALTER TABLE IF EXISTS ai_usage
  DROP CONSTRAINT IF EXISTS ai_usage_user_id_fkey;

ALTER TABLE IF EXISTS credit_transactions
  DROP CONSTRAINT IF EXISTS credit_transactions_user_id_fkey;

ALTER TABLE IF EXISTS users
  DROP CONSTRAINT IF EXISTS users_id_fkey;

ALTER TABLE IF EXISTS ai_usage
  ALTER COLUMN user_id TYPE text USING user_id::text;

ALTER TABLE IF EXISTS credit_transactions
  ALTER COLUMN user_id TYPE text USING user_id::text;

ALTER TABLE IF EXISTS users
  ALTER COLUMN id TYPE text USING id::text;

ALTER TABLE IF EXISTS users
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS polar_customer_id text,
  ADD COLUMN IF NOT EXISTS polar_subscription_id text,
  ADD COLUMN IF NOT EXISTS subscription_status text,
  ADD COLUMN IF NOT EXISTS current_period_start timestamptz,
  ADD COLUMN IF NOT EXISTS current_period_end timestamptz,
  ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean DEFAULT false;

ALTER TABLE IF EXISTS users
  ALTER COLUMN credits SET DEFAULT 0,
  ALTER COLUMN credits_used SET DEFAULT 0,
  ALTER COLUMN cancel_at_period_end SET DEFAULT false;

ALTER TABLE IF EXISTS credit_transactions
  ADD COLUMN IF NOT EXISTS reference_id text,
  ADD COLUMN IF NOT EXISTS balance_after integer;

ALTER TABLE IF EXISTS ai_usage
  ADD CONSTRAINT ai_usage_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS credit_transactions
  ADD CONSTRAINT credit_transactions_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS webhook_events (
  event_id text primary key,
  event_type text not null,
  status text not null default 'processing',
  received_at timestamptz not null,
  processed_at timestamptz,
  error text,
  created_at timestamptz not null default now()
);

CREATE TABLE IF NOT EXISTS generated_images (
  id text primary key,
  user_id text not null,
  group_id text,
  image_url text not null,
  image_key text,
  prompt text,
  model_id text,
  source_model_url text,
  source_outfit_urls jsonb,
  generation_params jsonb,
  credit_cost integer default 1,
  is_favorite boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS uploaded_models (
  id text primary key,
  user_id text not null,
  project_id text,
  name text not null,
  subtitle text,
  image_url text not null,
  image_key text,
  image_size integer,
  image_content_type text,
  is_public boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS uploaded_locations (
  id text primary key,
  user_id text not null,
  project_id text,
  name text not null,
  subtitle text,
  image_url text not null,
  image_key text,
  image_size integer,
  image_content_type text,
  is_public boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

CREATE INDEX IF NOT EXISTS users_clerk_user_id_idx ON users(clerk_user_id);
CREATE INDEX IF NOT EXISTS users_email_idx ON users(email);
CREATE INDEX IF NOT EXISTS users_polar_subscription_id_idx ON users(polar_subscription_id);
CREATE INDEX IF NOT EXISTS users_subscription_status_idx ON users(subscription_status);

CREATE INDEX IF NOT EXISTS credit_transactions_user_id_idx ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS credit_transactions_created_at_idx ON credit_transactions(created_at desc);
CREATE INDEX IF NOT EXISTS credit_transactions_type_idx ON credit_transactions(type);
CREATE INDEX IF NOT EXISTS credit_transactions_reference_idx ON credit_transactions(reference_id);

CREATE INDEX IF NOT EXISTS webhook_events_status_idx ON webhook_events(status);
CREATE INDEX IF NOT EXISTS webhook_events_received_at_idx ON webhook_events(received_at);

CREATE INDEX IF NOT EXISTS generated_images_user_id_idx ON generated_images(user_id);
CREATE INDEX IF NOT EXISTS generated_images_created_at_idx ON generated_images(created_at desc);
CREATE INDEX IF NOT EXISTS generated_images_group_id_idx ON generated_images(group_id);
CREATE INDEX IF NOT EXISTS generated_images_user_created_idx ON generated_images(user_id, created_at desc);

CREATE INDEX IF NOT EXISTS uploaded_models_user_id_idx ON uploaded_models(user_id);
CREATE INDEX IF NOT EXISTS uploaded_models_project_id_idx ON uploaded_models(project_id);

CREATE INDEX IF NOT EXISTS uploaded_locations_user_id_idx ON uploaded_locations(user_id);
CREATE INDEX IF NOT EXISTS uploaded_locations_project_id_idx ON uploaded_locations(project_id);
