# Blooma

Blooma is an AI media studio for creators to generate image assets with consistent models, locations, and camera presets. It includes asset libraries, generation history, and credit-based billing.

## Product Overview

- Studio for image generation
- Model library (custom and public)
- Location library (custom and public)
- Camera presets
- Generation history for review and reuse
- Credits and billing (Polar)
- Authentication and user accounts (Clerk)

## Tech Stack

- Next.js App Router, React, TypeScript, Tailwind CSS
- Cloudflare D1 (SQLite) and R2 storage
- Fal AI for generation
- Polar for billing
- Clerk for auth

## Local Development

### Prerequisites

- Node.js 20+
- Cloudflare account (D1 and R2)
- Clerk account
- Fal AI account
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

- NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
- CLERK_SECRET_KEY
- FAL_KEY
- CLOUDFLARE_ACCOUNT_ID
- CLOUDFLARE_D1_DATABASE_ID
- CLOUDFLARE_D1_API_TOKEN
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
npm run test:e2e     # Playwright tests
npm run test:e2e:ui  # Playwright UI
npm run test:e2e:headed  # Playwright headed mode
```

## Project Structure

```
blooma/
  docs/                 # Product and engineering docs
  migrations/           # D1 migrations
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
- /assets/camera-settings
- /pricing
- /sign-in, /sign-up

## API Routes

- /api/generate-image
- /api/image-edit
- /api/models
- /api/locations
- /api/camera-presets
- /api/upload-image
- /api/studio/generated
- /api/studio/generated/[id]
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

Migrations live in `migrations/`. Apply them to D1 with:

```bash
npx wrangler d1 migrations apply blooma --remote
```

## Deployment

- Vercel is a common deployment target for the Next.js app.
- Ensure D1 and R2 environment variables are configured in your host.

## License

Proprietary software. All rights reserved.
