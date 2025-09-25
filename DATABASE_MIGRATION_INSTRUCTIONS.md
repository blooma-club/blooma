# Database Migration Instructions

## Issue Fixed

The timeline editor was failing because the `cards` table was missing timeline-related columns. The error message was:

```
Could not find the 'duration' column of 'cards' in the schema cache
```

## Migration Required

You need to run the database migration to add the timeline columns to your Supabase database.

### Step 1: Apply Database Migration

**Option A: Using Supabase Dashboard (Recommended)**

1. Open your Supabase project dashboard
2. Go to the "SQL Editor" tab
3. Copy and paste the contents of `database_migration_timeline.sql`
4. Click "Run" to execute the migration

**Option B: Using Supabase CLI**

```bash
supabase db reset --linked
# Or apply the migration directly:
psql -h your-supabase-host -U postgres -d postgres -f database_migration_timeline.sql
```

### Step 2: Verify Migration Success

After running the migration, verify that the new columns exist:

```sql
-- Check if the columns were added successfully
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'cards'
AND column_name IN ('duration', 'audio_url', 'voice_over_url', 'voice_over_text', 'start_time');
```

Expected result should show all 5 new columns.

### Step 3: Refresh Schema Cache

In Supabase, you may need to refresh the schema cache:

1. Go to your Supabase project dashboard
2. Navigate to "Settings" > "API"
3. Click "Refresh schema cache" or wait a few minutes for auto-refresh

### Step 4: Test Timeline Functionality

After the migration:

1. Start your development server: `npm run dev`
2. Navigate to any storyboard in your app
3. Click the "Timeline" tab
4. Try adjusting frame duration and adding audio/voice-over
5. Check that no more database errors appear in the console

## Files Modified

The following files have been updated to support the new timeline database schema:

1. **`database_migration_timeline.sql`** - Database migration script
2. **`src/lib/supabase.ts`** - Updated database types
3. **`src/app/api/timeline/route.ts`** - Fixed column name mapping
4. **`src/app/api/cards/route.ts`** - Added timeline fields to allowed keys
5. **`src/lib/utils.ts`** - Updated cardToFrame mapping
6. **`src/components/storyboard/ProfessionalTimelineEditor.tsx`** - Enhanced with database integration

## Column Details

The migration adds these columns to the `cards` table:

| Column Name       | Type          | Default | Description                  |
| ----------------- | ------------- | ------- | ---------------------------- |
| `duration`        | DECIMAL(5,2)  | 3.0     | Scene duration in seconds    |
| `audio_url`       | TEXT          | NULL    | Background audio file URL    |
| `voice_over_url`  | TEXT          | NULL    | Voice-over audio file URL    |
| `voice_over_text` | TEXT          | NULL    | Voice-over script text       |
| `start_time`      | DECIMAL(10,2) | 0.0     | Scene start time in timeline |

## Troubleshooting

**If you still see schema cache errors:**

1. Wait 5-10 minutes for Supabase to update its cache
2. Try refreshing the schema cache manually in Supabase dashboard
3. Restart your Next.js development server
4. Clear your browser cache and reload the page

**If columns don't appear:**

1. Verify you're connected to the correct database
2. Check that the migration script ran without errors
3. Ensure you have the necessary database permissions

**If timeline still doesn't work:**

1. Check browser console for any JavaScript errors
2. Verify the API routes are responding correctly
3. Test with a simple duration change first
4. Check network requests in browser dev tools

## Next Steps

Once the migration is complete, you'll have a fully functional professional timeline editor with:

- ✅ Draggable clip duration adjustment
- ✅ Audio file upload and management
- ✅ Voice-over script editing
- ✅ Persistent timeline data storage
- ✅ Multi-track visual interface

The timeline will automatically save changes to the database and provide real-time updates across different views of your storyboard.
