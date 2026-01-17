-- Drop unused legacy storyboard tables
DROP TABLE IF EXISTS cards CASCADE;
DROP TABLE IF EXISTS characters CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS ai_usage CASCADE;

-- Drop unused enum types if present
DROP TYPE IF EXISTS storyboard_status CASCADE;
