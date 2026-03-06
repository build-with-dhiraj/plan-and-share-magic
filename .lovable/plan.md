

# UPSC Current Affairs Engine — Final Consolidated Implementation Plan

All five inputs absorbed: 3 research reports + source hierarchy spec + this 47-source pipeline registry. This is the single build plan.

---

## What We Are Building

A daily-habit product that replaces The Hindu + Twitter + Telegram PDFs for UPSC aspirants. Open it, know what matters today in 5 minutes, and actually retain it for the exam. Fully automated — zero editors.

---

## Source Pipeline: 47 Sources, 6 Tiers, 3 Ingestion Paths

### Path A — RSS (22 sources, ~40 endpoints, zero Firecrawl credits)

| # | Source | Key Feeds | Frequency |
|---|--------|-----------|-----------|
| 1 | PIB | English all-ministries RSS | 30 min |
| 2 | The Hindu | Editorial, National, International, Business, Sci-Tech, Op-Ed (7 feeds) | 30 min |
| 3 | Indian Express | Main, Explained (CRITICAL), Opinion, National, Economy (5 feeds) | 30 min |
| 4 | LiveMint | News, Economy, Politics, Opinion (4 feeds) | 60 min |
| 5 | Hindustan Times | India, Editorials, World (3 feeds) | 2 hrs |
| 6 | The Wire | Main, Politics, Economy, Environment, Rights (5 feeds) | 2 hrs |
| 7 | Business Standard | Economy, Markets, Opinion (3 feeds) | 2 hrs |
| 8 | Frontline | Main, Cover Story (2 feeds) | Daily |
| 9 | Down To Earth (CSE) | Main RSS | 2 hrs |
| 10 | Mongabay India | Main RSS | Daily |
| 11 | PWOnlyIAS | WordPress /feed/ | 2 hrs |
| 12 | ForumIAS | 9PM Brief RSS | 2 hrs |
| 13 | ClearIAS | WordPress /feed/ | Daily |
| 14 | Drishti IAS | RSS feed | 60 min |
| 15 | GKToday | /feed/ | Daily |
| 16 | Adda247 CA | /feed/ | Daily |
| 17 | World Bank SA Blog | RSS | Weekly |
| 18 | WHO News | RSS | Weekly |

### Path B — Firecrawl (18 sources, ~80-120 pages/day)

| # | Source | Target Pages | Frequency |
|---|--------|-------------|-----------|
| 19 | PRS Legislative Research | /billtrack, /theprsblog, /policy, /sessiontrack | 2 hrs (session), daily |
| 20 | MEA | /press-releases, /bilateral-documents | 4 hrs |
| 21 | NITI Aayog | /reports, /press-releases | Daily |
| 22 | RBI | Press releases, monetary policy pages | 2 hrs |
| 23 | Parliament (sansad.in) | Starred questions, committee reports | Daily (sessions) |
| 24 | Supreme Court | Landmark judgments | Weekly |
| 25 | InsightsIAS | Daily CA pages | 2 hrs |
| 26 | Vision IAS (free) | Free current affairs pages | 2 hrs |
| 27 | SuperKalam | /current-affairs | 2 hrs |
| 28 | IAS Baba | Daily CA | Daily |
| 29 | Vajiram & Ravi | Daily CA, Prelims Bits | Daily |
| 30 | Civilsdaily | Homepage, Burning Issues | Daily |
| 31 | Sanskriti IAS | /current-affairs-daily | Daily |
| 32 | PadhAI | Blog/articles | Weekly |
| 33 | PrepAiro | Blog/PYQ analysis | Weekly |
| 34 | NewsbookAI | UPSC news pages | Daily |
| 35 | Jagran Josh | /current-affairs, UPSC section | Daily |
| 36 | India Environment Portal | Recent tagged content | Weekly |
| 37 | e-Gazette of India | Official notifications | Daily |
| 38-42 | IMF, UNDP, WTO, IPCC/UNFCCC | India pages, reports, news | Weekly/Monthly |

### Path C — PDF/Annual (4 sources)

| # | Source | Frequency |
|---|--------|-----------|
| 43 | Economic Survey | Annual (on release) |
| 44 | Union Budget | Annual (on release) |
| 45 | Yojana Magazine | Monthly |
| 46 | Kurukshetra Magazine | Monthly |
| 47 | Science Reporter | Monthly |

### MVP Demo Priority (10 sources first — covers 80% signal)
1. PIB RSS
2. The Hindu Editorial + National RSS
3. Indian Express Explained RSS
4. PRS Legislative Research (Firecrawl)
5. PWOnlyIAS RSS
6. Down To Earth RSS
7. LiveMint Economy RSS
8. Drishti IAS RSS
9. RBI press releases (Firecrawl)
10. ForumIAS 9PM Brief

---

## Database: `sources` Table

```sql
create table public.sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  tier int not null check (tier between 1 and 6),
  category text not null, -- 'government', 'newspaper', 'coaching', 'specialised', 'international', 'ai_native'
  trust_weight numeric not null default 0.5,
  ingest_method text not null check (ingest_method in ('rss', 'firecrawl', 'pdf')),
  base_url text not null,
  feed_urls jsonb default '[]',       -- array of RSS endpoint URLs
  crawl_pages jsonb default '[]',     -- array of Firecrawl target URLs
  crawl_frequency_minutes int default 120,
  is_canonical_truth_source boolean default false,
  allow_full_text_storage boolean default false,
  allow_excerpt_only boolean default true,
  legal_risk_level text default 'medium' check (legal_risk_level in ('low', 'medium', 'high')),
  source_policy jsonb default '{}',   -- storage/display rules, excerpt limits
  gs_paper_mapping text[] default '{}',
  upsc_relevance text default 'MEDIUM',
  active boolean default true,
  last_crawled_at timestamptz,
  last_error text,
  items_fetched_count int default 0,
  notes text,
  created_at timestamptz default now()
);
```

Seeded with all 47 sources on first deploy, with exact feed URLs and crawl configs from this registry.

### Other Core Tables (unchanged from previous plan)
- `raw_articles` — with `source_layer` (tier), `hash_dedupe`, `embedding` (vector 1536)
- `issues` — clusters with `consensus_count`, `confidence_score`
- `issue_sources` — junction
- `topics` — GS paper mapping with colours
- `issue_topics` — relevance scores
- `prelims_facts` — atomic facts with `source_url`, `extraction_confidence`
- `mains_paragraphs` — background/features/significance/challenges/way_forward
- `essay_hooks` — quotes, examples, contrarian angle
- `static_anchors` — what to revise in textbooks
- `mcqs` — UPSC format with explanations
- `daily_digests` — top 10-15 per day
- `user_profiles`, `user_roles`, `bookmarks`, `progress`, `spaced_cards`, `streaks`, `user_quiz_attempts`

---

## Automated Pipeline (Edge Functions)

### `ingest-sources` (cron: tiered frequency)
- Iterates active sources grouped by `crawl_frequency_minutes`
- **RSS path**: native `fetch()` → XML parse → extract title/url/excerpt/pubDate → dedup by SHA-256 URL hash → insert `raw_articles`
- **Firecrawl path**: Firecrawl connector → scrape target pages → extract markdown → dedup → insert
- **PDF path**: detect PDF links → store metadata → extract text chunks
- Respects `allow_full_text_storage` / `allow_excerpt_only` per source
- Stores `tier` on every raw_article for trust-weighted scoring

### `build-clusters` (cron: hourly)
- Embed titles+excerpts via Lovable AI Gateway → pgvector
- Cosine similarity > 0.82 → group into issues
- LLM generates `canonical_title` per cluster
- Calculate `consensus_count` from coaching sources (Tier 3/6)

### `summarise-issue` (triggered per new/updated issue)
- Gemini 3 Flash, temp 0.2, extractive-then-abstractive
- Generates: 60-word snapshot, atomic facts with citations, mains brief, essay hooks, static anchors, GS classification
- **Fact safety**: every fact must trace to Tier 1 or Tier 2 source URL
- Zod validation of all JSON output

### `generate-mcqs` (triggered per issue)
- UPSC "Consider the following statements" format
- Realistic distractors, explanations with citations

### `daily-digest` (cron: 6 AM IST)
- Score using: trust_weight × independent_sources × canonical_presence × consensus_count × GS_relevance × recency_decay
- Top 10-15 → finite daily brief

### `benchmark-delta` (cron: nightly)
- Compare our issue graph vs Tier 3 + Tier 6 sources
- Flag missed issues, flag over-covered low-value issues

### `chat-mentor` (on-demand, streaming)
- RAG over issue summaries → Gemini 3 Flash streaming

---

## Pages & UX

| Route | Experience |
|-------|-----------|
| `/` | Daily Brief: 10-15 Issue Cards, hero card, "You're all caught up ✓". Each card: 60-word snapshot, GS tags, static anchor, confidence badge, source count |
| `/issue/:id` | Issue Hub: timeline, multi-source cards with tier badges, Prelims/Mains/Essay tabs, static anchors, practice corner, citations |
| `/syllabus` | GS topic grid with coverage meters, filtered issues, "revise next" queue |
| `/revision` | Spaced retrieval queue, recall cards, MCQ drills, streak (recall-only) |
| `/practice` | MCQ bank, UPSC format, performance tracking |
| `/saved` | Bookmarks with GS filters, notes, synced via Supabase |
| `/search` | ⌘K with keyword + semantic search |
| `/mentor` | Streaming AI chat with RAG, suggestion chips |
| `/dashboard` | Streak, heatmap, coverage radar, read-vs-revised ratio |
| `/admin` | Source management for all 47 sources (toggle, re-crawl, logs), benchmark delta report, re-summarise |
| `/settings` | Profile, theme, exam target |
| `/onboarding` | 3-step: target year → subjects → preferences |

### Design System
- Deep navy `#1E3A5F`, Gold `#D4A843`, dark bg `#0C0F1A`
- GS colours: Polity=Indigo, Economy=Green, Environment=Emerald, IR=Red, S&T=Purple
- Inter for UI, Source Serif 4 for reading (18px, 1.6 line-height, 65ch max)
- Glassmorphism cards, skeleton shimmer, Framer Motion animations
- Mobile bottom nav + desktop top nav

---

## Build Sequence

| Step | What | Prompts |
|------|------|---------|
| 1 | Design system + routing shell + core components | 1-2 |
| 2 | Lovable Cloud + full DB schema + seed 47 sources + Auth + Onboarding | 1-2 |
| 3 | Today page with sample Issue Cards | 1 |
| 4 | Issue Hub with Prelims/Mains/Essay tabs, timeline, citations | 1-2 |
| 5 | Firecrawl connector + `ingest-sources` (RSS + Firecrawl + PDF paths) | 1 |
| 6 | `build-clusters` + `summarise-issue` with fact safety | 1-2 |
| 7 | Wire Today + Issue Hub to live data | 1 |
| 8 | Syllabus Explorer | 1 |
| 9 | Revision engine + spaced repetition + streaks | 1-2 |
| 10 | Practice / MCQ system | 1 |
| 11 | Mentor Chat (streaming AI + RAG) | 1 |
| 12 | Search (⌘K + semantic) | 1 |
| 13 | Dashboard (radar, heatmap, stats) | 1 |
| 14 | Admin panel (47 sources, logs, benchmark delta) | 1 |
| 15 | Saved + dark mode + polish + seed 200+ issues from 7-day crawl | 1 |

**~15-20 prompts to a complete, live app with real crawled data from 47 sources.**

Ready to start with Step 1 when you approve.

