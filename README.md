# UPSC Daily — Current Affairs & Practice Engine

An AI-powered UPSC preparation app that curates daily current affairs, generates practice MCQs, and tracks your preparation progress.

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **UI**: Tailwind CSS + shadcn/ui (Radix primitives)
- **Backend**: Supabase (PostgreSQL, Auth, Edge Functions)
- **Deployment**: Vercel (auto-deploys from `main`)
- **AI Pipeline**: Supabase Edge Functions + OpenAI for content processing

## Development

```bash
# Clone the repo
git clone https://github.com/build-with-dhiraj/plan-and-share-magic.git
cd plan-and-share-magic

# Install dependencies
npm install

# Start dev server (localhost:8080)
npm run dev

# Build for production
npm run build

# Run tests
npm test
```

## Development Workflow

| Tool | Purpose |
|------|---------|
| **Claude Code** | Complex architecture, multi-file refactors, planning |
| **Google Antigravity** | AI-powered IDE for day-to-day coding |
| **Google Stitch** | UI design & prototyping |
| **GitHub** | Central repo — all tools push here |
| **Vercel** | Auto-deploys on every push to `main` |

## Project Structure

```
src/
├── components/     # Reusable UI components (shadcn/ui based)
├── hooks/          # Custom React hooks (auth, data fetching, quiz state)
├── integrations/   # Supabase client & types
├── lib/            # Utilities (tags, utils)
├── pages/          # Route pages (Index, Practice, Saved, etc.)
└── test/           # Unit tests
supabase/
├── functions/      # Edge functions (process-content, mentor-chat, ingest-rss)
└── migrations/     # Database schema migrations
```
