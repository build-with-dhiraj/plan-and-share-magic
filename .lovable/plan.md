# PYQ System: Complete Implementation Plan for UPSC Daily

## PART 1 — REPO + CURRENT STATE AUDIT

### What Exists Today (Reusable)

| Component | Status | Reuse Strategy |
|---|---|---|
| `mcq_bank` table | Has `question`, `options`, `correct_index`, `explanation`, `topic`, `syllabus_tags`, `source`, `year`, `difficulty` | Do NOT reuse for PYQs. MCQ bank is AI-generated practice. PYQs need provenance, verification, and official answer key tracking that would pollute this table. |
| `spaced_cards` table | SM-2 spaced repetition with `question_id` (references mcq_bank IDs) | Extend to support PYQ question IDs via a `question_source` column (`mcq_bank` or `pyq_questions`). |
| `quiz_attempts` / `quiz_answers` | Tracks user practice sessions | Extend `quiz_type` enum to include `pyq_prelims`, `pyq_mains`. Add `pyq_question_id` nullable column to `quiz_answers`. |
| `bookmarks` table | Generic `item_type` + `item_id` pattern | Directly reusable. PYQ bookmarks use `item_type = 'pyq_question'`. |
| `useSpacedRepetition` hook | SM-2 algorithm, fetches from `mcq_bank` | Extend to also fetch from `pyq_questions` when `question_source = 'pyq'`. |
| `useMCQBank` hook | Fetches MCQs with topic/daily filters | Create parallel `usePYQBank` hook. Do not merge — different trust levels. |
| `IssuePage.tsx` | Single-scroll Drishti layout with MCQs, bookmark, revision actions | Add "Related PYQs" section between MCQs and FAQs. |
| `SyllabusPage.tsx` | GS Paper accordion with topic drill-down | Add PYQ count per topic, PYQ rail in topic detail view. |
| `PracticePage.tsx` | 2 tabs: Today's CA Quiz, Topic Practice | Add 3rd tab: PYQ Practice. |
| `SearchPage.tsx` | Searches articles, facts, mcqs with GS filters | Add PYQ content type tab. |
| `DashboardPage.tsx` | Shows quiz stats, topic coverage, streak | Add PYQ-specific stats section. |
| `AdminPage.tsx` | Placeholder cards only | Build real PYQ admin: source registry, ingestion logs, review queue. |
| `RevisionPage.tsx` | SM-2 review session UI | Works as-is if spaced_cards supports PYQ question IDs. |
| `mentor-chat` edge function | RAG over facts + articles, weak topic detection | Add PYQ retrieval to RAG context. |
| `process-content` edge function | 3-step article pipeline | Stays as-is. PYQ ingestion is a separate pipeline. |
| `MobileNav.tsx` | 4 tabs: Today, Practice, Revise, Syllabus | No change needed for PYQ — it surfaces within existing tabs. |

### What Should NOT Be Reused

- **`mcq_bank` for PYQs**: Mixing AI-generated questions with official UPSC questions in one table destroys the trust hierarchy.
- **`facts` table for PYQ facts**: Facts are extracted from news articles. PYQ data has a completely different provenance chain.

### Risky / Brittle Areas

- `useMentorChat.ts` hardcodes a different Supabase URL (`ligyvjuwvjeiiywxgewy`) than the project's actual ID (`zblmdfoddvqlaadqhlkq`). This needs fixing regardless of PYQ work.
- `useSpacedRepetition` assumes all `question_id` values exist in `mcq_bank`. Adding PYQ questions will break the MCQ lookup unless we add source-aware resolution.
- Admin page is entirely placeholder — needs real implementation for PYQ ops.

---

## PART 2 — USER EXPERIENCE DESIGN

### 1. Issue Page — Related PYQs

After the "Test Yourself" MCQ section and before "Quick Revision (FAQs)":

```
── Asked Before in UPSC ──────────────
  [Banner: "This topic has been asked 3 times in UPSC (2019, 2021, 2023)"]

  PRELIMS PYQs
  ┌─────────────────────────────────────┐
  │ [Official PYQ] [GS-2] [2021]       │
  │ Q: Consider the following about     │
  │    the Anti-Defection Law:          │
  │ Why linked: Direct match — Tenth    │
  │ Schedule, Speaker's role            │
  │ [Official Final Key: (c)]           │
  │ [Tap to practice]                   │
  └─────────────────────────────────────┘

  MAINS PYQs
  ┌─────────────────────────────────────┐
  │ [Official PYQ] [GS-2] [2019]       │
  │ Q: "Discuss the effectiveness of    │
  │    the anti-defection law..."       │
  │ Why linked: Tenth Schedule,         │
  │ parliamentary procedure             │
  │ [No official answer key]            │
  │ [View editorial framework]          │
  └─────────────────────────────────────┘

  PROBABLE QUESTIONS (AI-Generated)
  [existing MCQ cards — clearly labeled as practice]
```

**Badges**:
- **Official PYQ** (green shield) — always present
- **Official Final Key** (green check) — only for prelims with verified key
- **Institutional Archive** (blue book) — sourced from NDLI
- **Mirror Copy** (grey copy) — from ForumIAS etc.
- **AI-Suggested Link** (purple sparkle) — link confidence < 0.8
- **Editorial Mapping** (orange pen) — human-reviewed link

**Confidence banner**: If >= 2 official PYQs match with confidence >= 0.7, show: "This topic has been asked X times in UPSC — high exam relevance."

### 2. Syllabus / Topic Page

```
← Back
[Polity] Polity & Governance
42 articles · 18 PYQs

[Practice Polity MCQs]  [Practice Polity PYQs]

── PYQ Timeline ──────────────────────
  2024: 3 Prelims, 1 Mains
  2023: 2 Prelims, 2 Mains
  2022: 4 Prelims, 1 Mains

── Themes with Repeated PYQ History ──
  • Anti-Defection Law (4 times)
  • Fundamental Rights (6 times)
  • Federal Structure (3 times)
```

Filters: GS-1/2/3/4/Essay, Prelims GS1/CSAT, year range, theme search.

### 3. Practice Page — 3 Tabs

```
[Today's CA Quiz] [PYQ Practice] [Topic Practice]

── PYQ Practice tab ──────────────────
  🏛 Official UPSC PYQ Practice
  Solve actual past UPSC questions

  [All Papers] [Prelims Only] [Mains Only]
  Filters: [GS-1] [GS-2] [GS-3] [GS-4] [2024] [2023] ...
  [Start PYQ Practice]
```

Answer review: Show official final key badge when available. Never claim official answer for Mains.

### 4. Mentor Chat

When user asks "Has UPSC asked this before?":
1. Retrieve matching PYQs first
2. Explain concept link
3. Optionally generate probable question

### 5. Search

Add "PYQs" as 5th content type tab with filters: year, stage, paper, GS area, topic, official status.

### 6. Dashboard / Progress

- PYQs Solved count
- Prelims PYQ Accuracy (separate from practice accuracy)
- Topics with Repeated PYQ History
- Weak PYQ Topics

### 7. Admin / Operations

- PYQ Source Registry (counts per source)
- Ingestion Jobs (status, progress)
- Review Queue (pending verification, manual review, duplicates)
- Actions: Trigger Ingestion, Review Parses, Reconcile Sources, Dedupe

---

## PART 3 — DATA MODEL / SCHEMA PLAN

### Table: `pyq_sources`
Registry of known PYQ source endpoints.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `name` | text NOT NULL | "UPSC Official", "NDLI", "ForumIAS" |
| `source_type` | text NOT NULL | `official`, `institutional`, `mirror` |
| `base_url` | text | Base URL for crawling |
| `is_active` | boolean DEFAULT true | |
| `trust_level` | integer DEFAULT 0 | 0=mirror, 1=institutional, 2=official |
| `notes` | text | |
| `created_at` | timestamptz DEFAULT now() | |

RLS: Admin-only write. Public read.
Unique: `(name, source_type)`

### Table: `pyq_documents`
Each ingested PDF/page representing one exam paper.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `source_id` | uuid FK → pyq_sources | |
| `year` | integer NOT NULL | Exam year |
| `exam_stage` | text NOT NULL | `prelims`, `mains` |
| `paper_code` | text NOT NULL | `gs1`, `gs2`, `gs3`, `gs4`, `essay`, `csat` |
| `source_url` | text NOT NULL | |
| `source_file_hash` | text | SHA-256 |
| `raw_storage_path` | text | Supabase storage path |
| `verification_status` | text DEFAULT 'pending' | `official_verified`, `institutional_verified`, `mirror_unverified`, `pending` |
| `is_official` | boolean DEFAULT false | |
| `official_release_date` | date | |
| `extraction_method` | text | `text_extract`, `ocr`, `manual` |
| `parse_quality` | numeric | 0.0–1.0 |
| `human_reviewed` | boolean DEFAULT false | |
| `total_questions` | integer | |
| `notes` | text | |
| `created_at` | timestamptz DEFAULT now() | |
| `updated_at` | timestamptz DEFAULT now() | |

RLS: Admin-only write. Authenticated read (verified docs).
Unique: `(year, exam_stage, paper_code, source_id)`
Index: `(year, exam_stage, paper_code)`, `(verification_status)`

### Table: `pyq_questions`
Individual parsed questions from exam papers.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `document_id` | uuid FK → pyq_documents | |
| `year` | integer NOT NULL | Denormalized |
| `exam_stage` | text NOT NULL | |
| `paper_code` | text NOT NULL | |
| `question_number` | integer | |
| `question_text` | text NOT NULL | Normalized |
| `raw_question_text` | text | Original extracted |
| `question_type` | text NOT NULL | `mcq`, `descriptive`, `case_study` |
| `marks` | integer | For mains |
| `word_limit` | integer | For mains |
| `raw_source_page` | integer | |
| `is_published` | boolean DEFAULT false | |
| `verification_status` | text DEFAULT 'pending' | |
| `parse_quality` | numeric DEFAULT 1.0 | |
| `human_reviewed` | boolean DEFAULT false | |
| `confidence_score` | numeric DEFAULT 0.8 | |
| `gs_papers` | text[] DEFAULT '{}' | |
| `topic` | text | |
| `syllabus_tags` | text[] DEFAULT '{}' | |
| `created_at` | timestamptz DEFAULT now() | |
| `updated_at` | timestamptz DEFAULT now() | |

RLS: Public read for `is_published = true`. Admin write.
Unique: `(document_id, question_number)`
Index: `(year, exam_stage)`, `(paper_code)`, `(topic)`, `(is_published)`, GIN on `syllabus_tags`, GIN on `gs_papers`

### Table: `pyq_prelims_options`
MCQ options for prelims questions.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `question_id` | uuid FK → pyq_questions | |
| `option_label` | text NOT NULL | 'A', 'B', 'C', 'D' |
| `option_text` | text NOT NULL | |
| `sort_order` | integer | |

RLS: Same as pyq_questions.
Unique: `(question_id, option_label)`

### Table: `pyq_prelims_keys`
Official answer keys for prelims.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `question_id` | uuid FK → pyq_questions UNIQUE | |
| `answer_label` | text NOT NULL | 'A', 'B', 'C', 'D', 'DROPPED' |
| `key_source` | text NOT NULL | `upsc_final`, `consensus_unofficial` |
| `is_official` | boolean NOT NULL DEFAULT false | |
| `source_url` | text | |
| `source_file_hash` | text | |
| `notes` | text | |
| `created_at` | timestamptz DEFAULT now() | |

RLS: Public read. Admin write.
Unique: `(question_id, key_source)`

### Table: `pyq_tags`
Rich tagging for theme-based retrieval.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `question_id` | uuid FK → pyq_questions | |
| `tag_type` | text NOT NULL | `gs_paper`, `subject`, `topic`, `subtopic`, `theme`, `static_anchor`, `current_affairs_theme` |
| `tag_value` | text NOT NULL | |
| `confidence` | numeric DEFAULT 1.0 | |
| `source` | text DEFAULT 'manual' | `manual`, `ai_generated`, `rules_based` |

RLS: Public read. Admin write.
Unique: `(question_id, tag_type, tag_value)`
Index: `(tag_type, tag_value)`, `(question_id)`

### Table: `pyq_question_embeddings`
Vector embeddings for semantic search.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `question_id` | uuid FK → pyq_questions UNIQUE | |
| `embedding` | vector(768) | pgvector |
| `model` | text DEFAULT 'text-embedding-004' | |
| `created_at` | timestamptz DEFAULT now() | |

RLS: Internal use. Not exposed to client.
Index: HNSW on `embedding`.

### Table: `issue_pyq_links`
Maps articles to related PYQs.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `article_id` | uuid FK → articles | |
| `pyq_question_id` | uuid FK → pyq_questions | |
| `link_type` | text NOT NULL | `direct_theme_match`, `static_dynamic_link`, `entity_overlap`, `syllabus_overlap` |
| `link_reason` | text | |
| `confidence_score` | numeric NOT NULL | 0.0–1.0 |
| `lexical_score` | numeric | |
| `semantic_score` | numeric | |
| `syllabus_overlap_score` | numeric | |
| `gs_overlap_score` | numeric | |
| `human_reviewed` | boolean DEFAULT false | |
| `is_published` | boolean DEFAULT true | |
| `created_at` | timestamptz DEFAULT now() | |

RLS: Public read for published. Admin write.
Unique: `(article_id, pyq_question_id)`
Index: `(article_id)`, `(pyq_question_id)`, `(confidence_score DESC)`

### Table: `pyq_import_jobs`
Ingestion pipeline tracking.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `source_id` | uuid FK → pyq_sources | |
| `status` | text DEFAULT 'pending' | `pending`, `running`, `completed`, `failed` |
| `document_url` | text | |
| `year` | integer | |
| `exam_stage` | text | |
| `paper_code` | text | |
| `questions_extracted` | integer DEFAULT 0 | |
| `error_message` | text | |
| `started_at` | timestamptz | |
| `completed_at` | timestamptz | |
| `created_at` | timestamptz DEFAULT now() | |

RLS: Admin only.

### Table: `pyq_parse_events`
Audit log of parsing attempts.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `document_id` | uuid FK → pyq_documents | |
| `event_type` | text | |
| `quality_score` | numeric | |
| `details` | jsonb | |
| `created_at` | timestamptz DEFAULT now() | |

RLS: Admin only.

### Table: `pyq_verification_events`
Audit trail for verification changes.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `question_id` | uuid FK → pyq_questions | |
| `document_id` | uuid FK → pyq_documents | |
| `old_status` | text | |
| `new_status` | text | |
| `reason` | text | |
| `verified_by` | uuid | |
| `created_at` | timestamptz DEFAULT now() | |

RLS: Admin only.

### Table: `pyq_model_answers`
Editorial/AI model answers for mains. NEVER official.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `question_id` | uuid FK → pyq_questions | |
| `answer_type` | text NOT NULL | `editorial`, `ai_generated`, `topper_reference` |
| `answer_text` | text NOT NULL | |
| `answer_framework` | jsonb | |
| `source_attribution` | text | |
| `is_published` | boolean DEFAULT false | |
| `created_at` | timestamptz DEFAULT now() | |

RLS: Public read for published. Admin write.

### Table: `user_pyq_attempts`
User PYQ practice sessions.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid NOT NULL | |
| `practice_type` | text NOT NULL | `prelims`, `mains`, `mixed` |
| `year_filter` | integer | |
| `paper_filter` | text | |
| `total_questions` | integer | |
| `correct_answers` | integer | |
| `total_xp` | integer DEFAULT 0 | |
| `completed_at` | timestamptz DEFAULT now() | |

RLS: User own rows.

### Table: `user_pyq_answers`
Individual PYQ answers.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `attempt_id` | uuid FK → user_pyq_attempts | |
| `user_id` | uuid NOT NULL | |
| `pyq_question_id` | uuid FK → pyq_questions | |
| `selected_option` | text | |
| `is_correct` | boolean | |
| `answer_text` | text | For mains |
| `time_taken_seconds` | numeric | |
| `xp_earned` | integer DEFAULT 0 | |
| `created_at` | timestamptz DEFAULT now() | |

RLS: User own rows.

### Reusing Existing Tables

- **Bookmarks**: `item_type = 'pyq_question'`
- **Revision**: Extend `spaced_cards` with `question_source` column (`mcq_bank` default, `pyq_questions`)

---

## PART 4 — INGESTION + VERIFICATION PIPELINE

### Pipeline Flow
```
Source Discovery → PDF Fetch → Store Raw → Text Extract →
Question Boundary Detection → Option Parse → Key Link →
Dedup Check → Quality Score → Verification → Publish
```

### A. Official UPSC Documents
- Discovery: Manual seed from upsc.gov.in
- Fetch: Direct HTTP or Firecrawl → Supabase Storage
- Status: `official_verified`, `is_official = true`
- Text extraction → OCR fallback → parse event logging

### B. NDLI Archival Backfill
- Status: `institutional_verified`
- Can upgrade to `official_verified` if hash matches UPSC

### C. Mirror Sources
- Status: `mirror_unverified` until reconciled
- Answer keys: `key_source = 'consensus_unofficial'`, `is_official = false`

### Conservative Verification Policy

| Source | Initial Status | Can Upgrade To |
|---|---|---|
| UPSC Official | `official_verified` | — |
| NDLI matched | `institutional_verified` → `official_verified` | Hash/text match |
| Mirror | `mirror_unverified` | Reconcile against NDLI/UPSC |
| Prelims key from UPSC | `is_official = true` | — |
| Prelims key from coaching | `is_official = false` | Only if UPSC publishes |
| Mains "answer key" | DOES NOT EXIST | Never fake |

### Edge Functions
- `pyq-ingest`: PDF download, text extraction, question parsing
- `pyq-link-keys`: Answer key PDF parsing and linking

---

## PART 5 — TAGGING + LINKING ENGINE

### Two Link Types
1. **Direct Thematic Match**: Article on topic X → PYQ on same concept
2. **Static-Dynamic Linkage**: Current affairs article → PYQ on underlying static concept

### Linking Pipeline
1. Rules-based tagging (syllabus_tags, gs_papers, topic overlap)
2. AI/LLM-assisted (relevance scoring + link_reason generation)
3. Semantic similarity (cosine similarity on embeddings)

### Multi-Layer Relevance Score
```
composite_score = (
  0.15 * lexical_match +
  0.25 * semantic_similarity +
  0.20 * syllabus_overlap +
  0.15 * gs_overlap +
  0.15 * entity_overlap +
  0.10 * theme_recurrence
)
```

### Thresholds
- >= 0.7: Auto-publish
- 0.4–0.7: Human review queue
- < 0.4: Discard

### Edge Function
- `pyq-link-articles`: Score and link PYQs to articles after processing

---

## PART 6 — SEARCH + EMBEDDINGS PLAN

- Embed every published `pyq_questions.question_text`
- pgvector with HNSW index
- Full-text search via tsvector
- Hybrid search: `0.4 * text_rank + 0.6 * vector_similarity`
- Embedding refresh: on ingestion only (PYQ text is static)

---

## PART 7 — PRACTICE + EVALUATION LAYER

### Practice Modes
1. Official PYQ Practice (from `pyq_questions`)
2. Probable Question Mode (from `mcq_bank`)
3. Mixed Mode (future, opt-in only)

### Answer Review
- Prelims: Show official key badge when available
- Mains: Show editorial framework, never claim official answer

### PYQ → Revision Flow
- Incorrect prelims PYQs → auto-add to spaced_cards
- Bookmarked mains PYQs → review prompt cards

---

## PART 8 — REVISION / SPACED REPETITION

**Decision**: Extend `spaced_cards` with `question_source` column.
- `mcq_bank` (default) or `pyq_questions`
- Single unified revision queue, simpler UX

---

## PART 9 — ADMIN + QA OPERATIONS

- Source Registry View
- Ingestion Job History (retry, trigger)
- Document Review Queue (parse_quality < 0.7)
- Dedupe Merge UI
- Mismatch Detector
- Status actions: approved, rejected, duplicate, needs_manual_review

---

## PART 10 — SECURITY + COMPLIANCE

- Admin tables: `has_role(auth.uid(), 'admin')` for writes
- User tables: `auth.uid() = user_id`
- Published content: `is_published = true` for reads
- Edge functions use `SUPABASE_SERVICE_ROLE_KEY`
- UPSC papers are public records — store with attribution

---

## PART 11 — IMPLEMENTATION SEQUENCE

### Phase 1: Core PYQ Data + Issue Page Display (2-3 weeks)
- Create 6 core tables with RLS
- Storage bucket: `pyq-raw-documents`
- Edge functions: `pyq-ingest`, `pyq-link-keys`
- Seed Prelims GS1 (2015-2024) + Mains GS1-GS4+Essay (2018-2024)
- Add "Related PYQs" section to IssuePage

### Phase 2: Official Key + Topic Integration + PYQ Practice (2 weeks)
- Create `user_pyq_attempts`, `user_pyq_answers` tables
- Extend `spaced_cards` with `question_source`
- PYQ Practice tab in PracticePage
- PYQ counts in SyllabusPage

### Phase 3: Semantic Linking + Search + Dashboard (2-3 weeks)
- Enable pgvector
- Create `pyq_question_embeddings`, `pyq_tags`
- Edge functions: `pyq-embed`, `pyq-link-articles`
- PYQ tab in SearchPage
- PYQ stats in DashboardPage
- PYQ RAG in mentor-chat

### Phase 4: NDLI Backfill + Admin Tools + Model Answers (2-3 weeks)
- Create `pyq_import_jobs`, `pyq_parse_events`, `pyq_verification_events`, `pyq_model_answers`
- Build real AdminPage
- NDLI integration
- Reconciliation workflow

---

## PART 12 — FINAL DELIVERABLE SUMMARY

### Architecture
- 14 new tables + 1 column extension
- 4 new edge functions + 1 extended
- 1 storage bucket
- pgvector extension (Phase 3)

### Source-of-Truth Policy
- Tier 0: UPSC official → `official_verified`
- Tier 1: NDLI matched → `institutional_verified`
- Tier 2: Mirrors → `mirror_unverified`
- Mains: No official answer key. Never fake.

### Verification Badge System
| Badge | Color | Meaning |
|---|---|---|
| Official PYQ | Green shield | From UPSC official paper |
| Official Final Key | Green check | UPSC verified key |
| Institutional Archive | Blue book | From NDLI |
| Mirror Copy | Grey copy | Unverified mirror |
| Editorial Mapping | Orange pen | Human-reviewed link |
| AI-Suggested Link | Purple sparkle | Auto-linked, confidence < 0.8 |

### Top Risks
| Risk | Mitigation |
|---|---|
| PDF parsing fails for older papers | OCR fallback + manual review queue |
| Low-quality semantic links | Conservative threshold (0.7) + human review |
| spaced_cards extension breaks revision | Feature flag, backward-compatible default |
| Mains model answers mistaken for official | Hard-coded UI labels, no is_official column |

### Recommendation: Parallel PYQ Tables
Do NOT merge into `mcq_bank`. Only extend `spaced_cards` and reuse `bookmarks`.

### Narrowest MVP (MVP-0)
1. Create 3 tables: `pyq_questions`, `pyq_prelims_options`, `pyq_prelims_keys`
2. Manually seed 100 Prelims GS1 PYQs (2020-2024)
3. Create `issue_pyq_links` table
4. Add "Related PYQs" section to IssuePage
5. Add basic PYQ practice in PracticePage
6. Time: 3-5 days. No edge functions. No embeddings.
