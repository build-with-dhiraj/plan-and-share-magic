

## Plan: Drishti-Style Content Overhaul + Auto-Pipeline

### Current State
- **410 unprocessed articles**, 10 processed (mostly irrelevant local news)
- **No automation** — pipeline only runs manually
- **No UPSC relevance filtering** — ceiling collapses and Women's Day events mixed in
- **No Mains/Essay angle** anywhere in the system
- **IssuePage** uses tabs (Facts/MCQs/Source) instead of the Drishti-style single-scroll academic format

### What Changes (7 tasks)

---

#### Task 1: Database migration — add Drishti-style columns to `articles`

```sql
ALTER TABLE articles ADD COLUMN upsc_relevance numeric DEFAULT NULL;
ALTER TABLE articles ADD COLUMN depth_tier text DEFAULT NULL;
ALTER TABLE articles ADD COLUMN prelims_keywords text[] DEFAULT '{}';
ALTER TABLE articles ADD COLUMN mains_angle text DEFAULT NULL;
ALTER TABLE articles ADD COLUMN mains_question text DEFAULT NULL;
ALTER TABLE articles ADD COLUMN detailed_analysis jsonb DEFAULT NULL;
ALTER TABLE articles ADD COLUMN conclusion text DEFAULT NULL;
ALTER TABLE articles ADD COLUMN faqs jsonb DEFAULT NULL;
ALTER TABLE articles ADD COLUMN gs_papers text[] DEFAULT '{}';
```

- `depth_tier`: `'deep_analysis'` | `'important_facts'` | `'rapid_fire'`
- `detailed_analysis`: `[{heading: string, content: string}]` — the structured Q&A sections
- `faqs`: `[{question: string, answer: string}]`
- `gs_papers`: `['GS-1', 'GS-2']` etc.

---

#### Task 2: Overhaul `process-content` edge function

Replace current 2-step pipeline (extract facts → MCQs) with a **3-step Drishti-style pipeline**:

**Step 1 — Triage**: AI scores `upsc_relevance` (0.0–1.0) and assigns `depth_tier`. Articles below 0.3 get marked processed with no further work. This kills ceiling-collapse-level noise.

**Step 2 — Structured extraction** (single AI call generating the full Drishti skeleton):
- `summary` (2-3 bullet "Why in News")
- `prelims_keywords` (key terms/schemes/reports)
- `mains_angle` ("Why this matters for Mains" paragraph)
- `mains_question` (one Mains practice question)
- `detailed_analysis` (array of `{heading, content}` sections — depth varies by tier)
- `conclusion` (1-line synthesis)
- `faqs` (3-5 Q&A pairs for quick revision)
- `gs_papers` (GS-1/2/3/4 mapping)
- `syllabus_tags` (specific sub-topics)
- Facts extraction (merged into same call)

**Step 3 — MCQ generation** (keep existing logic, but now sourced from richer content)

Also: increase default batch size from 5 → 15, max from 20 → 30.

---

#### Task 3: Redesign `IssuePage` — single-scroll Drishti layout

Remove tabs entirely. Replace with a continuous scroll matching the UPSC mental model:

```text
← Back
[GS-2] [GS-3] [Economy] [Polity]      Source: The Hindu  •  2h ago

HEADLINE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

For Prelims: term1, term2, term3...
For Mains: Inclusive Growth, Federal Relations

── Why in News? ──────────────────────
  Summary paragraph / bullets

── Key Analysis ──────────────────────
  Section heading 1
    • bullet content...
  Section heading 2
    • bullet content...

── Why This Matters for Mains ────────
  mains_angle paragraph

── Practice Mains Question ───────────
  "Examine the structural factors..."

── Test Yourself ─────────────────────
  Interactive MCQs (expandable, answer inline)

── Quick Revision (FAQs) ────────────
  Q: ...  A: ...

── Key Facts for Prelims ────────────
  • fact 1  • fact 2  • fact 3

── Source ────────────────────────────
  🔗 Read original article
```

Falls back gracefully: if `detailed_analysis` is null (old articles), shows summary + facts + MCQs in the same layout without the deeper sections.

---

#### Task 4: Update `Index.tsx` — tiered Today's Brief + auto-refresh

- Filter: only show articles with `upsc_relevance >= 0.4` (or all if column is null for backward compat)
- Group into 3 sections with headers:
  - **In Depth** (deep_analysis tier)
  - **Key Facts** (important_facts tier)
  - **Quick Bites** (rapid_fire tier)
- Show GS Paper badges on cards
- Cap at ~15 articles/day
- Add `refetchInterval: 5 * 60 * 1000` and `refetchOnWindowFocus: true`

---

#### Task 5: Rename Practice labels (per Ajay)

- Practice page: "Daily Challenge" banner → **"Today's CA Quiz"** with subtitle "Based on today's current affairs"
- "Quick Drill" → **"Topic Practice"** with subtitle "Pick a syllabus topic and drill"
- DailyChallengePage header → **"Today's CA Quiz"**

---

#### Task 6: Set up `pg_cron` auto-pipeline (every 6 hours)

SQL insert (not migration — contains project-specific URLs/keys):
```sql
SELECT cron.schedule(
  'content-pipeline-6h',
  '0 */6 * * *',
  $$SELECT net.http_post(
    url := 'https://zblmdfoddvqlaadqhlkq.supabase.co/functions/v1/pipeline-trigger',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."}'::jsonb,
    body := '{"batch_size":20}'::jsonb
  )$$
);
```

This ensures the pipeline runs automatically 4x daily without any manual intervention.

---

#### Task 7: Trigger pipeline to clear 410-article backlog

Call `pipeline-trigger` via curl to start processing immediately. With the new relevance filter, low-quality articles will be processed fast (triage-only, no AI generation for junk).

---

### Files Changed
- New migration — add 9 columns to `articles`
- `supabase/functions/process-content/index.ts` — complete overhaul to 3-step Drishti pipeline
- `src/pages/IssuePage.tsx` — full redesign to single-scroll layout
- `src/pages/Index.tsx` — tiered grouping, relevance filter, auto-refresh
- `src/components/issues/IssueCard.tsx` — show GS Paper badges
- `src/pages/PracticePage.tsx` — rename labels
- `src/pages/DailyChallengePage.tsx` — rename header

### What We're NOT Doing
- No new modules or pages (per Ajay: sharpen, don't sprawl)
- No PYQ database yet (needs curated dataset)
- No changes to onboarding, dashboard, mentor, settings, or auth

