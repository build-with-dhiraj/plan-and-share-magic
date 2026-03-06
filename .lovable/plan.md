

## Current State Assessment

### What's Working
- **Content pipeline**: 129 articles ingested (52 today), 48 facts extracted, 29 MCQs generated
- **Cron job**: Active, runs every 6 hours via `pipeline-trigger` edge function
- **Auth, profiles, streaks, spaced repetition, quiz persistence**: All wired up
- **Pages**: Today's Brief, Explore (Syllabus), Revision, Practice, Daily Challenge, Mentor, Dashboard, Saved, Search, Settings, Admin

### What's NOT Working / Missing

#### 1. Quiz entry point missing from navigation
The **Practice** page exists at `/practice` but is NOT in the mobile bottom nav (`MobileNav.tsx` has: Today, Explore, Revise, Saved, Profile). Desktop nav has it, but mobile users have no way to reach quizzes directly. The Daily Challenge banner is inside `/practice`, so that's also hidden on mobile.

#### 2. 107 unprocessed articles sitting in the pipeline
The cron runs every 6h and processes only 5 articles per batch (`batch_size: 5`). At that rate it would take ~128 hours (5+ days) to clear the backlog. The pipeline-trigger doesn't pass a higher batch_size to `process-content`.

#### 3. Many source registries are returning zero articles
Only 14 of the 47 registered sources have articles today. Most Layer C (coaching) and Layer D (global reports) sources are scrape-type and many may be failing silently. Layer B RSS sources like `indian_express`, `the_wire`, `scroll`, `down_to_earth`, `business_standard` have zero articles today.

#### 4. Today's Brief (Index page) uses hardcoded sample data
`Index.tsx` shows `SAMPLE_ISSUES` — static placeholder content, not real articles from the database.

#### 5. Issue page is fully hardcoded
`IssuePage.tsx` shows a single hardcoded RBI article, doesn't fetch from DB by ID.

#### 6. Syllabus page uses hardcoded data
`SyllabusPage.tsx` has static `GS_TOPICS` with fake coverage percentages.

#### 7. Saved page is a stub
Shows "No saved issues yet" with no bookmark fetching logic.

#### 8. Search page not inspected but likely placeholder

---

## Plan

### Task 1: Add Practice/Quiz entry point to mobile navigation
- Add a "Practice" tab (or replace "Saved") in `MobileNav.tsx` so mobile users can access quizzes
- Alternatively, add a prominent quiz CTA card on the Today's Brief page

### Task 2: Process the 107 unprocessed articles
- Update `pipeline-trigger` to pass `batch_size: 20` instead of 5
- Manually trigger the pipeline multiple times or create a one-time catch-up invocation
- This will generate MCQs and facts from all today's content

### Task 3: Wire Today's Brief to real DB data
- Fetch processed articles from the `articles` table (today's date, processed=true) 
- Display them as IssueCards with real titles, summaries, syllabus tags
- Remove hardcoded `SAMPLE_ISSUES`

### Task 4: Wire Issue page to real article data
- Fetch article by ID from DB, display real content, facts, and linked MCQs
- Replace hardcoded content

### Task 5: Wire Syllabus page to real data
- Query articles grouped by syllabus_tags to show real coverage counts

### Task 6: Wire Saved page to bookmarks table
- Fetch user's bookmarks and display saved articles

### Task 7: Increase pipeline throughput & verify source coverage
- Increase cron frequency or batch size to keep up with daily volume
- Add error logging to identify which scrape sources are failing

### Priority Order
Tasks 1-3 are highest priority (quiz access + real content). Tasks 4-7 complete the data wiring.

