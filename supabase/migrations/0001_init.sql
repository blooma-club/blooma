-- Supabase initial schema (minimal SaaS)

create table if not exists users (
  id text primary key,
  clerk_user_id text unique,
  email text,
  name text,
  image_url text,
  avatar_url text,
  subscription_tier text,
  credits integer default 0,
  credits_used integer default 0,
  credits_reset_date timestamptz,
  polar_customer_id text,
  polar_subscription_id text,
  subscription_status text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists users_clerk_user_id_idx on users(clerk_user_id);
create index if not exists users_email_idx on users(email);
create index if not exists users_polar_subscription_id_idx on users(polar_subscription_id);
create index if not exists users_subscription_status_idx on users(subscription_status);

create table if not exists credit_transactions (
  id text primary key,
  user_id text not null references users(id),
  amount integer not null,
  type text not null,
  description text,
  reference_id text,
  balance_after integer,
  created_at timestamptz default now()
);

create index if not exists credit_transactions_user_id_idx on credit_transactions(user_id);
create index if not exists credit_transactions_created_at_idx on credit_transactions(created_at desc);
create index if not exists credit_transactions_type_idx on credit_transactions(type);
create index if not exists credit_transactions_reference_idx on credit_transactions(reference_id);

create table if not exists webhook_events (
  event_id text primary key,
  event_type text not null,
  status text not null default 'processing',
  received_at timestamptz not null,
  processed_at timestamptz,
  error text,
  created_at timestamptz not null default now()
);

create index if not exists webhook_events_status_idx on webhook_events(status);
create index if not exists webhook_events_received_at_idx on webhook_events(received_at);

create table if not exists generated_images (
  id text primary key,
  user_id text not null references users(id),
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

create index if not exists generated_images_user_id_idx on generated_images(user_id);
create index if not exists generated_images_created_at_idx on generated_images(created_at desc);
create index if not exists generated_images_group_id_idx on generated_images(group_id);
create index if not exists generated_images_user_created_idx on generated_images(user_id, created_at desc);

create table if not exists uploaded_models (
  id text primary key,
  user_id text not null references users(id),
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

create index if not exists uploaded_models_user_id_idx on uploaded_models(user_id);
create index if not exists uploaded_models_project_id_idx on uploaded_models(project_id);

create table if not exists uploaded_locations (
  id text primary key,
  user_id text not null references users(id),
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

create index if not exists uploaded_locations_user_id_idx on uploaded_locations(user_id);
create index if not exists uploaded_locations_project_id_idx on uploaded_locations(project_id);
