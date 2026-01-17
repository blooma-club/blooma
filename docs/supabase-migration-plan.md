# Supabase Migration Plan (SaaS Minimal)

Goal: Supabase schema for SaaS-critical features (Polar + credits + studio assets) after migration.

## Keep (SaaS-critical)
- users (subscription + credits)
- credit_transactions (audit)
- webhook_events (Polar idempotency)
- generated_images (gallery/history)
- uploaded_models, uploaded_locations (asset libraries)

## Remove/skip
- camera_presets (feature removed)
- ai_usage (unused)
- storyboard legacy credit cost

## Schema mapping (Postgres)
Use `timestamptz` and `jsonb` where relevant.

### users
- id (uuid, PK, matches Supabase auth user id)
- legacy_user_id (text, unique, nullable)
- email, name, image_url
- subscription_tier (text)
- credits, credits_used (int)
- credits_reset_date (timestamptz)
- polar_customer_id, polar_subscription_id
- subscription_status (text)
- current_period_start, current_period_end (timestamptz)
- cancel_at_period_end (boolean)
- created_at, updated_at (timestamptz, default now)

Indexes:
- users_legacy_user_id_idx (unique)
- users_email_idx
- users_subscription_status_idx
- users_polar_subscription_id_idx

### credit_transactions
- id (uuid, PK)
- user_id (text/uuid, FK users)
- amount (int)
- type (text: grant/consume/refund)
- description, reference_id
- balance_after (int)
- created_at (timestamptz, default now)

Indexes:
- credit_transactions_user_id_idx
- credit_transactions_created_at_idx
- credit_transactions_type_idx
- credit_transactions_reference_idx

### webhook_events
- event_id (text, PK)
- event_type (text)
- status (text)
- received_at, processed_at (timestamptz)
- error (text)
- created_at (timestamptz)

### generated_images
- id (uuid, PK)
- user_id (text/uuid, FK users)
- group_id (text)
- image_url, image_key
- prompt, model_id
- source_model_url (text)
- source_outfit_urls (jsonb)
- generation_params (jsonb)
- credit_cost (int)
- is_favorite (boolean)
- created_at, updated_at (timestamptz)

### uploaded_models / uploaded_locations
- id (uuid, PK)
- user_id (text/uuid, FK users)
- project_id (text)
- name, subtitle
- image_url, image_key
- image_size (int), image_content_type (text)
- is_public (boolean)
- created_at, updated_at (timestamptz)

## Code migration notes
- Replace legacy SQL helpers with Supabase JS query builder/RPCs to standardize DB access.
- Remove runtime `ensure*Table()` + `PRAGMA table_info` checks; rely on migrations only.
- Credits atomicity: use a SQL function or `UPDATE ... WHERE ... RETURNING` via RPC to keep "no negative credits" guarantee.
- Booleans: convert legacy integer booleans to Postgres boolean.
- JSON: convert `source_outfit_urls` and `generation_params` TEXT to `jsonb`.

## Data migration flow (minimal)
0) Apply `supabase/migrations/0001_init.sql` to create the base schema.
1) Export legacy tables: users, credit_transactions, webhook_events, generated_images, uploaded_models, uploaded_locations.
2) Transform:
   - cancel_at_period_end -> boolean
   - credits_reset_date/current_period_* -> timestamptz
   - source_outfit_urls/generation_params -> json
3) Import into Supabase using CSV or SQL inserts.
4) Switch env vars and deploy.
5) Smoke test: checkout -> webhook -> credit grant -> consume -> refund -> gallery load.
