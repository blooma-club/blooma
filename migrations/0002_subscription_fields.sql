-- Migration: Add subscription metadata columns to users table
-- These columns store Polar subscription details for accurate status tracking

-- Polar customer ID (maps to external_id in Polar)
ALTER TABLE users ADD COLUMN polar_customer_id TEXT;

-- Polar subscription ID for the active subscription
ALTER TABLE users ADD COLUMN polar_subscription_id TEXT;

-- Detailed subscription status from Polar (active, trialing, past_due, canceled, etc.)
ALTER TABLE users ADD COLUMN subscription_status TEXT;

-- Current billing period start timestamp (ISO 8601)
ALTER TABLE users ADD COLUMN current_period_start TEXT;

-- Current billing period end timestamp (ISO 8601)
ALTER TABLE users ADD COLUMN current_period_end TEXT;

-- Flag indicating subscription will be canceled at period end (0 = false, 1 = true)
ALTER TABLE users ADD COLUMN cancel_at_period_end INTEGER DEFAULT 0;

-- Index for subscription queries
CREATE INDEX IF NOT EXISTS users_polar_subscription_id_idx ON users(polar_subscription_id);
CREATE INDEX IF NOT EXISTS users_subscription_status_idx ON users(subscription_status);
