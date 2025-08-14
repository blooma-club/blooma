# AI Storyboard (Blooma)

An AI-powered content planning tool for creators. Turn your ideas into complete storyboards in minutes.

## 🚀 Key Features

- **AI Auto-Generated Storyboards**: Simply enter keywords to automatically generate 6-step cards: Hook, Problem, Solution, Evidence, Benefit, and CTA
- **Card-Based Visualization**: Drag and drop to reorder cards with individual editing support
- **Real-time Collaboration**: Real-time feedback and sharing with team members
- **Multiple Export Options**: Export in PNG, PDF, and MP4 formats
- **Accessibility Compliant**: WCAG 2.1 AA standards compliant

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **State Management**: Zustand
- **Styling**: Tailwind CSS v4
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **AI**: OpenAI GPT-4o, Replicate
- **Canvas**: react-konva
- **Deployment**: Vercel

## 🏗️ Project Structure

```
src/
├── app/                 # Next.js App Router
│   ├── layout.tsx      # Root layout
│   ├── page.tsx        # Home page
│   └── globals.css     # Global styles
├── components/          # Reusable components
│   └── ui/             # Base UI components
├── hooks/              # Custom hooks
├── lib/                # Utility functions and configuration
│   ├── supabase.ts     # Supabase client
│   └── utils.ts        # Utility functions
├── services/           # API services
├── store/              # Zustand state management
│   └── auth.ts         # Auth store
└── types/              # TypeScript type definitions
    └── index.ts        # Common types
```

## 🚀 Getting Started

### 1. Clone Repository and Install Dependencies

```bash
cd blooma
npm install
```

### 2. Environment Variables Setup

#### Step 1: Create Environment File

Copy the example environment file and configure your variables:

```bash
cp .env.example .env.local
```

#### Step 2: Configure Supabase

1. Create a new project at [Supabase Dashboard](https://supabase.com/dashboard)
2. Navigate to Settings > API
3. Copy your Project URL and anon key
4. Update `.env.local` with your values:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000

# AI Features (Optional)
# OpenRouter API for Gemini 2.0 Flash Experimental
OPENROUTER_API_KEY=your_openrouter_api_key_here

# Alternative AI Services (Optional)
OPENAI_API_KEY=your_openai_api_key_here
REPLICATE_API_TOKEN=your_replicate_api_token_here
```

#### Step 2.1: OpenRouter Setup (Recommended for AI Features)

1. Create an account at [OpenRouter](https://openrouter.ai)
2. Navigate to [API Keys](https://openrouter.ai/keys)
3. Create a new API key
4. Add the key to your `.env.local` file

**Benefits of OpenRouter**:

- Access to Gemini 2.0 Flash Experimental model
- Unified API for multiple AI models
- Better pricing and performance
- Simplified authentication

#### Step 2.2: Alternative AI Setup

If you prefer to use other AI services directly:

#### Step 3: Database Setup

Run the SQL scripts in the `supabase/` directory to set up your database:

```bash
# Run these SQL files in your Supabase SQL editor
supabase/schema.sql          # Database schema
supabase/rls-policies.sql    # Row Level Security policies
supabase/storage-setup.sql   # Storage configuration
```

> ⚠️ **Important**: Make sure to replace the placeholder values in `.env.local` with your actual Supabase credentials. The application will show clear error messages if environment variables are not properly configured.

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

#### First Run Checklist

Before starting development, ensure:

- [ ] `.env.local` file exists with valid Supabase credentials
- [ ] Database schema is set up in your Supabase project
- [ ] No other services are running on port 3000
- [ ] Node.js version is 18 or higher

If you encounter any errors during startup, check the [Troubleshooting](#-troubleshooting) section below.

## 📦 Available Scripts

```bash
npm run dev          # Run development server
npm run build        # Build for production
npm run start        # Run production server
npm run lint         # Run ESLint
```

## 🔧 Development Environment Setup

### Code Formatting

The project uses Prettier for automated code formatting:

```bash
npm run format       # Run code formatting
```

### Type Checking

TypeScript ensures type safety:

```bash
npm run type-check   # Run type checking
```

## 🚨 Troubleshooting

### Common Issues

#### 1. Supabase Connection Errors

**Error**: `Invalid URL` or `NEXT_PUBLIC_SUPABASE_URL environment variable not set`

**Solution**:

1. Ensure `.env.local` exists in your project root
2. Replace placeholder values with actual Supabase credentials
3. Restart your development server after updating environment variables

```bash
# Check if environment variables are loaded
echo $NEXT_PUBLIC_SUPABASE_URL
```

#### 2. Component Import Errors

**Error**: `Module not found: Can't resolve '@/components/...'`

**Solution**:

1. Check that the file exists in the correct location
2. Verify the component is properly exported
3. Ensure TypeScript path mapping is configured in `tsconfig.json`

#### 3. Database Connection Issues

**Error**: Authentication or database access denied

**Solution**:

1. Verify Row Level Security (RLS) policies are properly configured
2. Check if your database schema matches the type definitions
3. Ensure you're using the correct anon key (not the service role key)

#### 4. Development Server Issues

**Error**: Port already in use

**Solution**:

```bash
# Kill process using port 3000
lsof -ti:3000 | xargs kill -9

# Or use a different port
npm run dev -- -p 3001
```

### Getting Help

1. Check the [Issues](https://github.com/your-username/blooma/issues) section
2. Review the Supabase documentation
3. Ensure all environment variables are properly configured
4. Try clearing your browser cache and restarting the development server

## 🌟 Core Design Principles

- **Accessibility First**: WCAG 2.1 AA standards compliant
- **Performance Optimized**: Average page load time under 1.5 seconds
- **Mobile-Friendly**: Responsive design and PWA support
- **Scalable Architecture**: Domain-based folder structure
- **Type Safety**: Full TypeScript support

## 📝 License

This project is distributed under the MIT License.

## 🤝 Contributing

1. Fork this repository
2. Create a new feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Create a Pull Request

## 📞 Support

If you encounter any issues or have questions, please reach out through [Issues](https://github.com/your-username/blooma/issues).

---

**Blooma Team** - AI-Powered Content Planning Tool for Creators
