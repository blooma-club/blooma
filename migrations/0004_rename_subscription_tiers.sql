-- Migration: Rename subscription tiers from legacy names to new premium B2B names
-- Starter -> Small Brands
-- Pro -> Agency
-- Studio remains Studio

-- Update existing user subscription tiers
UPDATE users SET subscription_tier = 'Small Brands' WHERE subscription_tier = 'Starter';
UPDATE users SET subscription_tier = 'Agency' WHERE subscription_tier = 'Pro';

-- Note: 'Studio' tier name remains unchanged, no update needed
