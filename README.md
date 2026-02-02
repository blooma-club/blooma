# Blooma

Blooma is an AI media studio for creators to generate image assets with consistent models, locations, and composition presets. It includes asset libraries, generation history, and credit-based billing.

## Product Overview

- Studio for image generation
- Model library (custom and public)
- Location library (custom and public)
- Composition presets
- Generation history for review and reuse
- Credits and billing (Polar)
- Authentication and user accounts (Supabase Auth)

## Tech Stack

- Next.js App Router, React, TypeScript, Tailwind CSS
- Supabase (Postgres) and Cloudflare R2 storage
- Google Gemini for generation
- Polar for billing
- Supabase Auth

## Local Development

### Prerequisites

- Node.js 20+
- Cloudflare account (R2)
- Supabase project
- Supabase Auth (Google OAuth)
- Google AI Studio (Gemini) account
- Polar account (optional, billing)

### Setup

1. Install dependencies:

```bash
npm install
```

2. Create a `.env.local` and set environment variables (see below).

3. Run the dev server:

```bash
npm run dev
```

4. Open http://localhost:3000

### Environment Variables

Required for core features:

- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- GEMINI_API_KEY
- SUPABASE_DATABASE_URL
- CLOUDFLARE_ACCOUNT_ID
- R2_ACCOUNT_ID
- R2_ACCESS_KEY_ID
- R2_SECRET_ACCESS_KEY
- R2_BUCKET_NAME
- R2_PUBLIC_BASE_URL

Optional (feature specific):

- CLOUDFLARE_API_BASE_URL
- NEXT_PUBLIC_APP_URL
- POLAR_ACCESS_TOKEN (or POLAR_API_KEY)
- POLAR_SERVER
- POLAR_BLOOMA_1000_PRODUCT_ID, POLAR_BLOOMA_3000_PRODUCT_ID, POLAR_BLOOMA_5000_PRODUCT_ID
- SUNO_API_KEY, SUNO_MODEL_ID, SUNO_DEFAULT_TAGS
- ELEVENLABS_API_KEY, ELEVENLABS_MODEL_ID, ELEVENLABS_VOICE_ID, ELEVENLABS_VOICE_STABILITY, ELEVENLABS_VOICE_SIMILARITY, ELEVENLABS_VOICE_STYLE
- OPENROUTER_API_KEY
- OPENAI_API_KEY

## Scripts

```bash
npm run dev          # Start dev server (Turbopack)
npm run build        # Production build
npm run start        # Start production server
npm run lint         # ESLint (Next.js)
```

## Project Structure

```
blooma/
  docs/                 # Product and engineering docs
  supabase/             # Supabase migrations
  public/               # Static assets
  src/
    app/                # Next.js App Router
    components/         # UI components
    hooks/              # React hooks
    lib/                # Server and client utilities
    store/              # Zustand stores
    types/              # Shared types
```

## App Routes

- / (landing)
- /studio
- /studio/create
- /studio/generated
- /assets/models
- /assets/locations
- /pricing
- /auth

## API Routes

- /api/studio/generate
- /api/image-edit
- /api/models
- /api/locations
- /api/upload-image
- /api/studio/history
- /api/studio/history/[id]
- /api/audio/voiceover
- /api/audio/music
- /api/audio/music/attach
- /api/audio/voices
- /api/user/credits
- /api/user/subscription
- /api/billing/checkout
- /api/billing/status
- /api/billing/webhook
- /api/diagnose
- /api/proxy-image

## Database and Migrations

Supabase migrations live in `supabase/migrations/`. Apply `supabase/migrations/0001_init.sql` to your Supabase project (SQL editor or `psql`).

## Deployment

- Vercel is a common deployment target for the Next.js app.
- Ensure Supabase and R2 environment variables are configured in your host.

## License

Proprietary software. All rights reserved.
