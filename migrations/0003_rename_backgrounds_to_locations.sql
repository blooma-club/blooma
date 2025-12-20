-- Migrate uploaded_backgrounds to uploaded_locations (idempotent)
CREATE TABLE IF NOT EXISTS uploaded_locations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  project_id TEXT,
  name TEXT NOT NULL,
  subtitle TEXT,
  image_url TEXT NOT NULL,
  image_key TEXT,
  image_size INTEGER,
  image_content_type TEXT,
  is_public INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS uploaded_locations_user_id_idx ON uploaded_locations(user_id);
CREATE INDEX IF NOT EXISTS uploaded_locations_project_id_idx ON uploaded_locations(project_id);

CREATE TABLE IF NOT EXISTS uploaded_backgrounds (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  subtitle TEXT,
  image_url TEXT NOT NULL,
  image_key TEXT,
  image_size INTEGER,
  image_content_type TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

INSERT OR IGNORE INTO uploaded_locations (
  id,
  user_id,
  project_id,
  name,
  subtitle,
  image_url,
  image_key,
  image_size,
  image_content_type,
  is_public,
  created_at,
  updated_at
)
SELECT
  id,
  user_id,
  NULL AS project_id,
  name,
  subtitle,
  image_url,
  image_key,
  image_size,
  image_content_type,
  0 AS is_public,
  created_at,
  updated_at
FROM uploaded_backgrounds;

DROP INDEX IF EXISTS uploaded_backgrounds_user_id_idx;
DROP INDEX IF EXISTS uploaded_backgrounds_project_id_idx;
DROP TABLE IF EXISTS uploaded_backgrounds;
