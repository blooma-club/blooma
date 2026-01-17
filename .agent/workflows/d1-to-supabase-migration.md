---
description: D1 to Supabase Database Migration Guide
---

# D1 to Supabase Migration Guide

Complete migration from Cloudflare D1 to Supabase PostgreSQL.

## Overview

### Current D1 Tables
| Table | Purpose |
|-------|---------|
| `users` | User accounts, subscriptions, credits |
| `webhook_events` | Polar webhook idempotency |
| `generated_images` | Studio-generated images |
| `uploaded_models` | User-uploaded model assets |
| `uploaded_locations` | User-uploaded location assets |
| `camera_presets` | Custom camera presets |
| `ai_usage` | AI usage tracking (legacy) |

### Files Using D1
- `src/lib/db/d1.ts` - D1 HTTP client (DELETE after migration)
- `src/lib/db/users.ts` - User CRUD operations
- `src/lib/db/generatedImages.ts` - Generated images CRUD
- `src/lib/db/customAssets.ts` - Models/Locations CRUD
- `src/lib/db/cameraPresets.ts` - Camera presets CRUD
- `src/lib/db/webhookEvents.ts` - Webhook idempotency

---

## Phase 1: Supabase Setup

### 1.1 Create Supabase Project
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Create new project
3. Note: `Project URL`, `anon key`, `service_role key`

### 1.2 Environment Variables
```env
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...
```

### 1.3 Install Dependencies
```bash
npm install @supabase/supabase-js
```

---

## Phase 2: Schema Migration

### 2.1 Create Tables in Supabase SQL Editor

```sql
-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    clerk_user_id TEXT UNIQUE,
    email TEXT,
    name TEXT,
    image_url TEXT,
    avatar_url TEXT,
    subscription_tier TEXT DEFAULT 'free',
    credits INTEGER DEFAULT 0,
    credits_used INTEGER DEFAULT 0,
    credits_reset_date TIMESTAMPTZ,
    -- Polar subscription metadata
    polar_customer_id TEXT,
    polar_subscription_id TEXT,
    subscription_status TEXT,
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS users_clerk_user_id_idx ON users(clerk_user_id);
CREATE INDEX IF NOT EXISTS users_email_idx ON users(email);
CREATE INDEX IF NOT EXISTS users_polar_subscription_id_idx ON users(polar_subscription_id);

-- Webhook Events Table (for idempotency)
CREATE TABLE IF NOT EXISTS webhook_events (
    event_id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'processing',
    received_at TIMESTAMPTZ NOT NULL,
    processed_at TIMESTAMPTZ,
    error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS webhook_events_status_idx ON webhook_events(status);
CREATE INDEX IF NOT EXISTS webhook_events_received_at_idx ON webhook_events(received_at);

-- Generated Images Table
CREATE TABLE IF NOT EXISTS generated_images (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    group_id TEXT,
    image_url TEXT NOT NULL,
    image_key TEXT,
    prompt TEXT,
    model_id TEXT,
    source_model_url TEXT,
    source_outfit_urls JSONB,
    generation_params JSONB,
    credit_cost INTEGER DEFAULT 1,
    is_favorite BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS generated_images_user_id_idx ON generated_images(user_id);
CREATE INDEX IF NOT EXISTS generated_images_created_at_idx ON generated_images(created_at DESC);
CREATE INDEX IF NOT EXISTS generated_images_group_id_idx ON generated_images(group_id);
CREATE INDEX IF NOT EXISTS generated_images_user_created_idx ON generated_images(user_id, created_at DESC);

-- Uploaded Models Table
CREATE TABLE IF NOT EXISTS uploaded_models (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id TEXT,
    name TEXT NOT NULL,
    subtitle TEXT,
    image_url TEXT NOT NULL,
    image_key TEXT,
    image_size INTEGER,
    image_content_type TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS uploaded_models_user_id_idx ON uploaded_models(user_id);

-- Uploaded Locations Table
CREATE TABLE IF NOT EXISTS uploaded_locations (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id TEXT,
    name TEXT NOT NULL,
    subtitle TEXT,
    image_url TEXT NOT NULL,
    image_key TEXT,
    image_size INTEGER,
    image_content_type TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS uploaded_locations_user_id_idx ON uploaded_locations(user_id);

-- Camera Presets Table
CREATE TABLE IF NOT EXISTS camera_presets (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    prompt TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS camera_presets_user_id_idx ON camera_presets(user_id);

-- Credit Transactions Table (audit logging)
CREATE TABLE IF NOT EXISTS credit_transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,              -- Positive: grant, Negative: consumption
    type TEXT NOT NULL,                   -- 'grant', 'consume', 'refund'
    description TEXT,                     -- 'subscription_cycle', 'image_generation', etc.
    reference_id TEXT,                    -- webhook_id, image_id, or other reference
    balance_after INTEGER,                -- User's credit balance after this transaction
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS credit_transactions_user_id_idx ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS credit_transactions_created_at_idx ON credit_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS credit_transactions_type_idx ON credit_transactions(type);
CREATE INDEX IF NOT EXISTS credit_transactions_reference_idx ON credit_transactions(reference_id);

-- AI Usage Table (legacy, optional)
CREATE TABLE IF NOT EXISTS ai_usage (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    action_type TEXT NOT NULL,
    model_name TEXT,
    credit_cost INTEGER NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ai_usage_user_id_idx ON ai_usage(user_id);
```

### 2.2 Enable Row Level Security (RLS)
```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploaded_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploaded_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE camera_presets ENABLE ROW LEVEL SECURITY;

-- Create policies (for service role, bypass RLS)
-- You'll use service_role key in server-side code
```

---

## Phase 3: Create Supabase Client

### 3.1 Create `src/lib/supabase/client.ts`
```typescript
import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Client-side Supabase client (for browser)
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)
```

### 3.2 Create `src/lib/supabase/server.ts`
```typescript
'use server'

import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Server-side Supabase client (bypasses RLS)
export function getSupabaseAdmin() {
  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false }
  })
}
```

### 3.3 Generate Types (Optional but recommended)
```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/lib/supabase/database.types.ts
```

---

## Phase 4: Migrate DB Layer Files

### 4.1 Replace `d1.ts` with `supabase.ts`
The D1 client will be replaced by Supabase client. Keep `d1.ts` temporarily for reference.

### 4.2 Update Each DB Layer File

#### Pattern: D1 → Supabase Query Conversion

| D1 Pattern | Supabase Pattern |
|------------|------------------|
| `queryD1<T>(sql, params)` | `supabase.from('table').select()...` |
| `queryD1Single<T>(sql, params)` | `supabase.from('table').select().single()` |
| `queryD1Batch(statements)` | Multiple await calls or transaction |
| `INSERT INTO ... VALUES` | `supabase.from('table').insert({...})` |
| `UPDATE ... SET` | `supabase.from('table').update({...}).eq()` |
| `DELETE FROM ... WHERE` | `supabase.from('table').delete().eq()` |

### 4.3 Migration Order
1. `src/lib/supabase/client.ts` (NEW)
2. `src/lib/supabase/server.ts` (NEW)
3. `src/lib/db/users.ts` → Update imports and queries
4. `src/lib/db/generatedImages.ts` → Update imports and queries
5. `src/lib/db/customAssets.ts` → Update imports and queries
6. `src/lib/db/cameraPresets.ts` → Update imports and queries
7. `src/lib/db/webhookEvents.ts` → Update imports and queries
8. `src/lib/db/d1.ts` → DELETE

---

## Phase 5: Data Migration

### 5.1 Export Data from D1
```bash
# Using Cloudflare Dashboard or wrangler
wrangler d1 execute YOUR_DATABASE --command="SELECT * FROM users" --json > users_export.json
```

### 5.2 Import to Supabase
Use Supabase Dashboard's Table Editor or write a migration script.

---

## Phase 6: Environment Cleanup

### 6.1 Remove D1 Environment Variables
```env
# DELETE these from .env.local
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_D1_DATABASE_ID=
CLOUDFLARE_D1_API_TOKEN=
```

### 6.2 Update `wrangler.toml` (if exists)
Remove D1 bindings.

---

## Phase 7: Testing Checklist

- [ ] User signup/login syncs correctly
- [ ] Credits are tracked properly
- [ ] Generated images are saved and retrieved
- [ ] Model/Location assets upload and list
- [ ] Camera presets CRUD works
- [ ] Webhook idempotency functions
- [ ] Subscription updates from Polar work

---

## Rollback Plan

Keep D1 database and credentials for 30 days after migration. If issues arise:
1. Revert code changes via git
2. Restore D1 environment variables
3. Re-deploy

---

## Notes

- **Type Safety**: Use `database.types.ts` for full TypeScript support
- **RLS**: With `service_role` key, RLS is bypassed; add policies if using `anon` key
- **Timestamps**: Supabase uses `TIMESTAMPTZ`, D1 used ISO strings
- **Booleans**: Supabase uses native `BOOLEAN`, D1 used `INTEGER (0/1)`
- **JSON**: Supabase uses native `JSONB`, D1 stored as `TEXT`
