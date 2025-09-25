# Credits System Setup Guide

## Overview

This guide will help you set up the complete credits system for Blooma. The credits system tracks AI usage, manages user subscriptions, and provides transaction history.

## Step 1: Database Migration

### Apply the Database Migration

**Option A: Using Supabase Dashboard (Recommended)**

1. Open your Supabase project dashboard
2. Go to the "SQL Editor" tab
3. Copy and paste the contents of `database_migration_users_credits.sql`
4. Click "Run" to execute the migration

**Option B: Using Supabase CLI**

```bash
# If you have Supabase CLI installed
supabase db reset --linked

# Or apply the migration directly:
psql -h your-supabase-host -U postgres -d postgres -f database_migration_users_credits.sql
```

### What the Migration Creates

The migration creates three main tables:

1. **`users`** - User profiles with credits and subscription information
2. **`ai_usage`** - Records of AI operations and credit consumption
3. **`credit_transactions`** - History of all credit transactions

## Step 2: Verify Migration Success

After running the migration, verify that the tables were created:

```sql
-- Check if the tables were created successfully
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('users', 'ai_usage', 'credit_transactions');
```

Expected result should show all 3 tables.

## Step 3: Test the Credits System

### Test User Creation

When a new user signs up, they should automatically get a user profile with default credits:

```sql
-- Check if a user profile was created for your test user
SELECT id, email, credits, subscription_tier
FROM public.users
WHERE email = 'your-test-email@example.com';
```

### Test Credits API

1. Start your development server: `npm run dev`
2. Sign in to your application
3. Check the browser console - you should no longer see the "relation 'public.users' does not exist" error
4. The credits should display correctly in the UI

## Step 4: Understanding the Credits System

### Default Credits

- **New users**: 100 credits (basic tier)
- **Basic tier**: 100 credits/month
- **Pro tier**: 1000 credits/month
- **Enterprise tier**: 5000 credits/month

### Credit Costs

| Operation         | Basic | Pro | Enterprise |
| ----------------- | ----- | --- | ---------- |
| Text Generation   | 1     | 1   | 1          |
| Image Generation  | 10    | 8   | 6          |
| Script Generation | 5     | 4   | 3          |
| Image Edit        | 15    | 12  | 10         |

### How Credits Are Consumed

Credits are automatically consumed when:

- Generating images via AI
- Creating scripts
- Editing images
- Any AI-powered operation

### Credit Reset

Credits reset monthly on the 1st of each month. The system automatically:

- Resets `credits_used` to 0
- Updates `credits_reset_date` to next month
- Restores full monthly credit allocation

## Step 5: Integration Points

### API Endpoints

The credits system integrates with these API endpoints:

- `GET /api/credits?action=balance` - Get user's current credits
- `GET /api/credits?action=usage` - Get usage statistics
- `GET /api/credits?action=transactions` - Get transaction history
- `POST /api/credits` - Add credits (admin/payment system)

### Automatic Credit Consumption

Credits are automatically consumed in these API routes:

- `/api/generate-image` - Image generation
- `/api/script/generate` - Script generation
- `/api/image-edit` - Image editing
- Any other AI-powered operations

## Step 6: Monitoring and Management

### View User Credits

```sql
-- View all users and their credit status
SELECT
  email,
  credits,
  credits_used,
  subscription_tier,
  credits_reset_date
FROM public.users
ORDER BY created_at DESC;
```

### View Usage Statistics

```sql
-- View AI usage by operation type
SELECT
  operation_type,
  COUNT(*) as usage_count,
  SUM(credits_consumed) as total_credits_used
FROM public.ai_usage
WHERE created_at >= DATE_TRUNC('month', NOW())
GROUP BY operation_type;
```

### View Transaction History

```sql
-- View recent credit transactions
SELECT
  u.email,
  ct.type,
  ct.amount,
  ct.description,
  ct.created_at
FROM public.credit_transactions ct
JOIN public.users u ON ct.user_id = u.id
ORDER BY ct.created_at DESC
LIMIT 20;
```

## Step 7: Troubleshooting

### Common Issues

**1. "relation 'public.users' does not exist"**

- Solution: Run the database migration script
- Verify tables exist with the SQL query in Step 2

**2. Credits not updating after operations**

- Check if the AI operation APIs are calling `consumeCredits()`
- Verify the `ai_usage` table is being populated
- Check for errors in the API logs

**3. User profile not created on signup**

- Verify the trigger `on_auth_user_created` exists
- Check if the `handle_new_user()` function is working
- Manually create user profile if needed

**4. Credits showing as 0 or incorrect**

- Check the `users` table for the correct user record
- Verify the credits API is returning the right data
- Check for any database constraint violations

### Manual User Creation

If automatic user creation isn't working, you can manually create a user profile:

```sql
INSERT INTO public.users (id, email, name, credits, subscription_tier)
VALUES (
  'your-user-id-from-auth-users',
  'user@example.com',
  'User Name',
  100,
  'basic'
);
```

## Step 8: Production Considerations

### Security

- All tables have Row Level Security (RLS) enabled
- Users can only access their own data
- Admin operations require service role key

### Performance

- Indexes are created for optimal query performance
- Consider adding more indexes based on usage patterns
- Monitor query performance in production

### Monitoring

- Set up alerts for low credit balances
- Monitor AI usage patterns
- Track credit consumption rates
- Set up billing alerts for credit purchases

## Next Steps

Once the credits system is set up:

1. **Test thoroughly** with different user scenarios
2. **Monitor usage** to understand credit consumption patterns
3. **Set up billing** integration for credit purchases
4. **Configure alerts** for system health
5. **Document** any custom business rules

The credits system is now ready to track AI usage and manage user subscriptions!
