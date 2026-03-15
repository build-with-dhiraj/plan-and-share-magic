# Focused App Restructure — Implementation Plan

## Overview
7 changes to simplify navigation, auth, content sources, and UX.

---

## Phase 1: Navigation Simplification (Tabs → 3 instead of 5)

### New Bottom Nav: `Today` | `Practice` | `More`

**Today tab** (`/`)
- Top: Dashboard stats strip (XP, Streak, Quizzes Done, Accuracy) — compact 4-column row, only shown when signed in
- Middle: Article feed (unchanged)
- IssueCard: Remove the Revise (RotateCcw) CTA button entirely. Keep Bookmark button (will prompt auth if signed out).

**Practice tab** (`/practice`)
- Keep existing 3 sub-tabs: CA Quiz | PYQ Practice | Topic
- Add 4th sub-tab: **Revise** — moves the entire RevisionPage content (SM-2 queue, review session, done screen) into this tab
- Delete `/revision` route entirely

**More menu** (Sheet/drawer)
- Search → `/search` (absorbs Syllabus — add GS Paper accordion browser above search results as a "Browse by Topic" section)
- Saved → `/saved`
- Settings → `/settings` (Profile/Sign-out lives here)

### Files to change:
- `src/components/layout/MobileNav.tsx` — 3 tabs + More
- `src/components/layout/DesktopNav.tsx` — 2 main nav items (Today, Practice) + Search/Saved/Settings icons
- `src/pages/Index.tsx` — Add dashboard stats strip at top
- `src/pages/PracticePage.tsx` — Add Revise sub-tab (inline RevisionPage content)
- `src/pages/SearchPage.tsx` — Add GS Paper browser section (move SyllabusPage content here)
- `src/components/issues/IssueCard.tsx` — Remove RotateCcw button + staticAnchor
- `src/App.tsx` — Remove `/revision` and `/syllabus` routes, keep redirects

---

## Phase 2: Lazy Auth (No Sign-in Required Until Action)

### Approach: All routes public. Auth-gated actions show a sign-in prompt.

**Make public:**
- `/saved` → Show saved page but if not signed in, show "Sign in to see your bookmarks" with CTA
- `/dashboard` → Remove as standalone route (now embedded in Today page)
- `/settings` → If not signed in, show sign-in card instead of profile

**Auth-gated actions (prompt on click):**
- Bookmark button → If not signed in, show toast "Sign in to bookmark" + link to `/auth`
- Quiz attempt save → If not signed in, allow quiz play but skip DB persistence (localStorage fallback)
- Mentor chat → If not signed in, show "Sign in to chat" prompt
- SM-2 revision → Only shown when signed in

### Files to change:
- `src/components/auth/ProtectedRoute.tsx` — Convert to a soft gate (show content with sign-in prompt instead of redirect)
- `src/pages/SavedPage.tsx` — Add signed-out state
- `src/pages/SettingsPage.tsx` — Add signed-out state with sign-in CTA
- `src/components/issues/IssueCard.tsx` — Bookmark already shows toast when signed out; enhance to navigate to /auth
- `src/App.tsx` — Unwrap /saved, /settings from ProtectedRoute

---

## Phase 3: Simplify Auth (Remove Google SSO, Add Email OTP)

### Changes:
- Remove Google OAuth button from AuthPage
- Keep email/password sign-in/sign-up
- Add **email magic link** (Supabase `signInWithOtp({ email })`) — free, no SMS provider needed
- Phone OTP: **Not feasible for free** — Supabase requires a paid SMS provider (Twilio ~$0.01-0.05/SMS). Skip for MVP, note as future when revenue exists.

### New AuthPage flow:
1. **Tab 1: Email + Password** (existing)
2. **Tab 2: Magic Link** — Enter email → receive link → click → signed in (Supabase handles this for free)
3. Remove "Continue with Google" button
4. Remove Forgot Password (magic link replaces it)

### Files to change:
- `src/pages/AuthPage.tsx` — Remove Google OAuth, add magic link tab
- Supabase dashboard: Disable Google provider (optional, can leave enabled server-side)

---

## Phase 4: Embed AI Mentor in IssuePage + Auto-Hyperlink Terms

### 4a: Inline Mentor Chat at Bottom of IssuePage

Add a collapsible "Ask a Doubt" section at the bottom of every article:
- Collapsed by default: "Have a doubt about this article? Ask the AI Mentor"
- On expand: Shows a compact chat interface (reuse `useMentorChat` hook)
- Pre-loads article context (title, summary, prelims_keywords) into the system prompt
- Suggested prompts: "Explain [prelims_keyword]", "What's the mains angle?", "Practice question on this"
- Auth-gated: If not signed in, show "Sign in to ask questions"

### 4b: Auto-Hyperlink UPSC Terms (Drishti-style)

**Approach**: During AI processing (process-content edge function), add a new field `hyperlinked_terms` to the extraction prompt.

The AI returns: `[{ "term": "Bharatiya Nyaya Sanhita (BNS), 2023", "slug": "bharatiya-nyaya-sanhita-bns-2023" }]`

On the frontend (IssuePage), replace matched terms in the analysis text with internal links:
- Link to `/search?q=Bharatiya+Nyaya+Sanhita` (search within our own app)
- Or link to a dedicated `/term/slug` explainer page (future)
- Style: underline + accent color, like Drishti IAS

**Migration**: Add `hyperlinked_terms jsonb` column to `articles` table.

### Files to change:
- `src/pages/IssuePage.tsx` — Add inline mentor chat + term hyperlinking in analysis sections
- `supabase/functions/process-content/index.ts` — Add `hyperlinked_terms` to AI extraction prompt
- New migration: Add `hyperlinked_terms` column to articles table

---

## Phase 5: Content Source Overhaul

### Replace 43 sources with 4 focused sources:

| Source | Type | Feed | Method |
|--------|------|------|--------|
| **PW Only IAS** | Primary | `pwonlyias.com/feed/` (WordPress RSS) | RSS native parse |
| **Drishti IAS** | Benchmark | Firecrawl `current-affairs-news-analysis-editorials` | Firecrawl scrape |
| **SuperKalam** | Supplement | No RSS — `superkalam.com/current-affairs` | Firecrawl scrape |
| **PW YouTube** | Video | YouTube Data API v3 → transcripts | Custom API + Jina |

### Implementation:
1. **Migration**: DELETE all existing sources, INSERT 4 new sources with correct config
2. **YouTube ingestion**: New logic in `ingest-rss` — call YouTube Data API to get recent video IDs from `@OnlyIasnothingelse`, then fetch transcripts via youtube-transcript API or Jina reader on `youtube.com/watch?v=ID`
3. **Simplify layers**: All 4 sources become Layer A (primary) — no need for Layer B/C/D distinction anymore
4. **Update cron**: Simplify to 2 jobs — ingest every 2 hours, process every 2 hours
5. **Keep existing articles**: Don't delete old articles. New pipeline just adds from new sources going forward.

### Files to change:
- New migration: Replace sources table data
- `supabase/functions/ingest-rss/index.ts` — Add YouTube transcript handling, simplify layer logic
- `supabase/pg_cron_setup.sql` — Simplify cron schedule
- New migration: Update cron jobs

---

## Phase 6: Cleanup

- Delete `src/pages/RevisionPage.tsx` (content moved to PracticePage)
- Delete `src/pages/SyllabusPage.tsx` (content moved to SearchPage)
- Delete `src/pages/DashboardPage.tsx` (content moved to Index.tsx)
- Delete `src/pages/MentorPage.tsx` (mentor now inline in IssuePage)
- Remove MentorFAB component (no longer needed as separate page)
- Remove `/revision`, `/syllabus`, `/dashboard`, `/mentor` routes from App.tsx
- Add redirects: `/syllabus` → `/search`, `/revision` → `/practice`, `/dashboard` → `/`, `/mentor` → `/`
- Update any internal links pointing to removed routes

---

## Execution Order

1. **Phase 1** — Navigation simplification (biggest UX impact, most visible)
2. **Phase 2** — Lazy auth (unlock content for non-signed-in users)
3. **Phase 3** — Auth simplification (remove Google, add magic link)
4. **Phase 4** — IssuePage mentor + hyperlinks (feature enrichment)
5. **Phase 5** — Content source overhaul (backend, can run independently)
6. **Phase 6** — Cleanup dead files and routes

Each phase is independently deployable and testable.
