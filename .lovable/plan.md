

## UI/UX Regression & Smoke Test - Complete Findings

Tested every page on mobile (390x844) and desktop (1280x720) while logged in. Here are all inconsistencies organized by severity.

---

### CRITICAL (Broken functionality)

**1. Search page ignores `?tag=` from Explore page**
Clicking a topic on `/syllabus` navigates to `/search?tag=polity` but `SearchPage.tsx` never reads the URL param. The empty-state placeholder shows simultaneously with unfiltered results below. The Explore-to-Search flow is completely broken.

**2. Bookmark & "Revise later" buttons are dead (no-ops)**
`IssueCard.tsx` lines 57-67: Both buttons just call `e.preventDefault()` — nothing happens. Users see clickable icons that do nothing. This is the most prominent dead interaction in the app.

**3. "1 sources" grammar error on every card**
`SourceBadge.tsx` always renders `{count} sources` — no singular handling. Every card shows "1 sources".

**4. Hardcoded 85% confidence on every article**
`Index.tsx` line 74: `confidence: 0.85` is hardcoded. Every article card shows "85%" which is fake data.

---

### HIGH (Poor UX / misleading)

**5. No back button on IssuePage**
Article detail page has no way to go back. Users must use browser back or bottom nav.

**6. Desktop nav: no active highlight for `/issue/:id` routes**
`DesktopNav.tsx` uses exact `location.pathname === item.path` matching. Viewing an article shows no highlighted nav item.

**7. MentorFAB overlaps content on mobile**
Positioned at `bottom-20 right-4` which overlaps article cards and search results. On some pages it covers interactive elements.

**8. Saved page unreachable**
`/saved` works but is not linked from any navigation (mobile or desktop). Users cannot discover it.

**9. Mentor page shows "GPT-4.1" model name**
`MentorPage.tsx` line 111: Hardcoded "Powered by your content pipeline • GPT-4.1" — may not match actual model, and leaks implementation details.

**10. MentorPage chat height doesn't account for mobile nav**
Uses `h-[calc(100vh-8rem)]` but mobile nav is 3.5rem + safe area. Chat input may be hidden behind bottom nav.

---

### MEDIUM (Visual inconsistencies)

**11. Inconsistent page headers**
- Some pages: `text-xl sm:text-2xl` (Index, Syllabus) ✓
- Other pages: `text-2xl` only (Revision, Dashboard, Settings, Saved) — oversized on small phones

**12. Inconsistent top padding**
- `py-4 sm:py-6`: Index, Syllabus
- `py-5`: Practice
- `py-6`: Revision, Settings, Saved, Dashboard

**13. Missing bottom padding on some pages**
Index and Syllabus have no `pb-24` — last cards can be hidden behind mobile nav. Dashboard, Revision, Settings correctly have `pb-24 lg:pb-6`.

**14. Inconsistent container widths**
`max-w-2xl` (Practice, Revision), `max-w-3xl` (Index, Saved, Settings, Mentor), `max-w-4xl` (Search, Dashboard, Syllabus, IssuePage). No clear strategy.

**15. Daily Challenge leaderboard shows fake data**
`DailyChallengePage.tsx` has `MOCK_LEADERBOARD` with hardcoded names ("Priya S.", "Arjun K.") when there's a real `daily_leaderboard` view in the DB.

---

### WHERE TO ADD TOOLTIPS

Based on testing, these interactive elements would benefit from tooltips:

1. **Bookmark button** on IssueCard — "Save to bookmarks"
2. **Revise later button** on IssueCard — "Add to revision queue"
3. **Confidence badge** on IssueCard — "AI confidence score for this analysis"
4. **Source badge** on IssueCard — "Number of source articles analyzed"
5. **Timed Mode toggle** on Practice page — "Enable 60-second timer per question"
6. **XP/Streak widget** on Revision page — "Your daily streak and total XP"
7. **Coverage progress bar** on Explore page — "Relative coverage compared to most-covered topic"
8. **Theme toggle buttons** on Settings page — tooltip already handled by icon labels
9. **Desktop nav icons** (Search, Flame/Dashboard, Theme, Profile) — need tooltips for icon-only buttons
10. **MentorFAB** — "Chat with AI Study Mentor"
11. **Daily Challenge trophy icon** — "+25 XP completion bonus"
12. **GS Paper filter buttons** on Search page — could show topic list on hover
13. **Layer filter pills** on Search page — could show example sources

---

## Fix Plan (8 tasks)

### Task 1: Fix Search `?tag=` integration
- Read `tag` from `useSearchParams` in `SearchPage.tsx`
- Auto-populate the query or apply a GS/topic filter when `tag` is present
- Hide empty-state placeholder when tag results are displayed

### Task 2: Wire Bookmark button on IssueCard
- Accept `user` from `useAuth` context
- On click: toggle insert/delete on `bookmarks` table
- Show filled `BookmarkCheck` icon when already bookmarked
- Query user's bookmarks to check state

### Task 3: Fix grammar + hardcoded data
- `SourceBadge`: `{count} {count === 1 ? "source" : "sources"}`
- `Index.tsx`: Remove hardcoded `confidence: 0.85` — either compute from article facts or hide the badge entirely

### Task 4: Add back button to IssuePage + fix desktop nav active state
- Add `<ArrowLeft>` back button at top of IssuePage
- Fix DesktopNav to use `startsWith` for active state matching (so `/issue/xxx` highlights "Today")

### Task 5: Normalize page layout
- Standardize all pages to `py-4 sm:py-6 pb-24 lg:pb-6`
- Standardize headers to `text-xl sm:text-2xl`
- Fix MentorPage height to account for mobile nav: `h-[calc(100vh-8rem)] lg:h-[calc(100vh-5rem)]` → better: `h-[calc(100dvh-10rem)]` on mobile

### Task 6: Add tooltips to key interactive elements
- Wrap icon-only buttons (Bookmark, Revise, Desktop nav icons, MentorFAB) in `Tooltip` components
- Add explanatory tooltips to Confidence badge, Source badge, Timed Mode toggle, Coverage bar, XP widget

### Task 7: Fix accessibility gaps
- Make Saved page reachable (add link from Settings or Profile, or as a secondary nav option)
- Remove hardcoded "GPT-4.1" from MentorPage — replace with generic "AI-powered"
- Wire Daily Challenge leaderboard to real `daily_leaderboard` DB view

### Task 8: Fix MentorFAB overlap
- Adjust positioning to avoid overlapping content, or add a small margin/offset on pages where it conflicts

