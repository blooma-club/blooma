-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    clerk_user_id TEXT,
    email TEXT,
    name TEXT,
    image_url TEXT,
    avatar_url TEXT,
    subscription_tier TEXT,
    credits INTEGER,
    credits_used INTEGER,
    credits_reset_date TEXT,
    created_at TEXT,
    updated_at TEXT
);

-- Projects Table
CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    is_public INTEGER,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Cards Table
CREATE TABLE IF NOT EXISTS cards (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    type TEXT,
    title TEXT,
    content TEXT,
    user_input TEXT,
    image_url TEXT,
    image_urls TEXT,
    selected_image_url INTEGER,
    image_key TEXT,
    image_size INTEGER,
    image_type TEXT,
    order_index INTEGER,
    next_card_id TEXT,
    prev_card_id TEXT,
    scene_number INTEGER,
    shot_type TEXT,
    angle TEXT,
    background TEXT,
    mood_lighting TEXT,
    dialogue TEXT,
    sound TEXT,
    image_prompt TEXT,
    storyboard_status TEXT,
    shot_description TEXT,
    card_width INTEGER,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- AI Usage Table
CREATE TABLE IF NOT EXISTS ai_usage (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    project_id TEXT,
    card_id TEXT,
    action_type TEXT NOT NULL,
    model_name TEXT,
    credit_cost INTEGER NOT NULL,
    metadata TEXT,
    created_at TEXT NOT NULL
);

-- Camera Presets Table
CREATE TABLE IF NOT EXISTS camera_presets (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    prompt TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Uploaded Models Table
CREATE TABLE IF NOT EXISTS uploaded_models (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    project_id TEXT,
    name TEXT NOT NULL,
    subtitle TEXT,
    image_url TEXT NOT NULL,
    image_key TEXT,
    image_size INTEGER,
    image_content_type TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Uploaded Backgrounds Table
CREATE TABLE IF NOT EXISTS uploaded_backgrounds (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    project_id TEXT,
    name TEXT NOT NULL,
    subtitle TEXT,
    image_url TEXT NOT NULL,
    image_key TEXT,
    image_size INTEGER,
    image_content_type TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Video Jobs Table
CREATE TABLE IF NOT EXISTS video_jobs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    frame_id TEXT NOT NULL,
    project_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    video_url TEXT,
    video_key TEXT,
    error_message TEXT,
    model_id TEXT,
    prompt TEXT,
    credit_cost INTEGER DEFAULT 0,
    qstash_message_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS users_clerk_user_id_idx ON users(clerk_user_id);
CREATE INDEX IF NOT EXISTS users_email_idx ON users(email);

CREATE INDEX IF NOT EXISTS projects_user_id_idx ON projects(user_id);

CREATE INDEX IF NOT EXISTS cards_project_id_idx ON cards(project_id);
CREATE INDEX IF NOT EXISTS cards_user_id_idx ON cards(user_id);
CREATE INDEX IF NOT EXISTS cards_order_index_idx ON cards(order_index);

CREATE INDEX IF NOT EXISTS ai_usage_user_id_idx ON ai_usage(user_id);
CREATE INDEX IF NOT EXISTS ai_usage_project_id_idx ON ai_usage(project_id);

CREATE INDEX IF NOT EXISTS camera_presets_user_id_idx ON camera_presets(user_id);

CREATE INDEX IF NOT EXISTS uploaded_models_user_id_idx ON uploaded_models(user_id);
CREATE INDEX IF NOT EXISTS uploaded_models_project_id_idx ON uploaded_models(project_id);

CREATE INDEX IF NOT EXISTS uploaded_backgrounds_user_id_idx ON uploaded_backgrounds(user_id);
CREATE INDEX IF NOT EXISTS uploaded_backgrounds_project_id_idx ON uploaded_backgrounds(project_id);

CREATE INDEX IF NOT EXISTS video_jobs_user_id_idx ON video_jobs(user_id);
CREATE INDEX IF NOT EXISTS video_jobs_frame_id_idx ON video_jobs(frame_id);
CREATE INDEX IF NOT EXISTS video_jobs_status_idx ON video_jobs(status);
