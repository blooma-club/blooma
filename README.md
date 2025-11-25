# Blooma

AI-powered storyboard generation platform for creators. Transform your ideas into visual storyboards in minutes.

## Overview

Blooma is a web application that helps creators, YouTubers, and content producers quickly visualize their content ideas. Using AI, it automatically generates storyboards from scripts, reducing planning time by up to 70%.

## Features

- 🎬 **AI Storyboard Generation** - Convert scripts to visual storyboards automatically
- 🖼️ **Image Generation** - Multiple AI models (Seedream, Nano Banana Pro, etc.)
- 🎥 **Video Generation** - Transform storyboard frames into video clips
- 👥 **Character Management** - Create and manage consistent characters across scenes
- 🎨 **Visual Style Presets** - Photorealistic, Cinematic, Illustration, and more
- 📤 **Export Options** - Download as PNG, PDF, or video
- 💳 **Credit System** - Flexible credit-based pricing

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS v4
- **State Management**: Zustand
- **Authentication**: Clerk
- **Database**: Cloudflare D1 (SQLite)
- **Storage**: Cloudflare R2
- **AI Services**: Fal AI, OpenRouter
- **Payments**: Polar

## Getting Started

### Prerequisites

- Node.js 20+
- npm or pnpm
- Cloudflare account (for D1 and R2)
- Clerk account (for authentication)
- Fal AI account (for image/video generation)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/your-org/blooma.git
cd blooma
```

2. Install dependencies:
```bash
npm install
```

3. Copy the environment template:
```bash
cp env.example.txt .env.local
```

4. Fill in your environment variables (see [Environment Variables](#environment-variables))

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000)

### Environment Variables

Copy `env.example.txt` to `.env.local` and fill in the values:

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | ✅ | Clerk publishable key |
| `CLERK_SECRET_KEY` | ✅ | Clerk secret key |
| `FAL_KEY` | ✅ | Fal AI API key |
| `CLOUDFLARE_ACCOUNT_ID` | ✅ | Cloudflare account ID |
| `CLOUDFLARE_D1_DATABASE_ID` | ✅ | D1 database ID |
| `CLOUDFLARE_D1_API_TOKEN` | ✅ | D1 API token |
| `R2_ACCOUNT_ID` | ✅ | R2 account ID |
| `R2_ACCESS_KEY_ID` | ✅ | R2 access key |
| `R2_SECRET_ACCESS_KEY` | ✅ | R2 secret key |
| `R2_BUCKET_NAME` | ✅ | R2 bucket name |
| `R2_PUBLIC_BASE_URL` | ✅ | R2 public URL |
| `OPENROUTER_API_KEY` | Optional | For script enhancement |
| `POLAR_ACCESS_TOKEN` | Optional | For billing features |

See `env.example.txt` for the complete list.

## Scripts

```bash
npm run dev          # Start development server (Turbopack)
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run test:e2e     # Run Playwright E2E tests
npm run test:e2e:ui  # Run E2E tests with UI
```

## Project Structure

```
blooma/
├── docs/                  # Documentation (PRD, TRD)
├── public/                # Static assets
├── src/
│   ├── app/               # Next.js App Router
│   │   ├── (workspace)/   # Authenticated routes
│   │   ├── api/           # API routes
│   │   └── ...
│   ├── components/        # React components
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Utilities & services
│   ├── store/             # Zustand stores
│   └── types/             # TypeScript types
└── workers/               # Cloudflare Workers
```

## API Routes

| Endpoint | Description |
|----------|-------------|
| `/api/projects` | Project CRUD operations |
| `/api/cards` | Storyboard card management |
| `/api/storyboard/build` | Generate storyboard from script |
| `/api/generate-image` | AI image generation |
| `/api/video/generate` | AI video generation |
| `/api/characters` | Character management |
| `/api/billing/*` | Payment and subscription |

## Deployment

### Vercel (Recommended)

1. Connect your repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy

### Cloudflare Workers

For the auth sync worker:
```bash
npx wrangler deploy
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is proprietary software. All rights reserved.

## Support

For questions or issues, please open an issue on GitHub.

