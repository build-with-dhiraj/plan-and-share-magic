

## Plan: Integrate Vansh's Feedback — Syllabus Restructure + Core Loop Tightening

### Context
Vansh's feedback validates our direction but highlights one critical structural gap and several refinements. Most of the pipeline work (Drishti-style content, relevance scoring, depth tiers) is already built. The main changes are about **information architecture** and **tightening the learn → practice → revise loop**.

---

### Task 1: Restructure Syllabus Page — GS Paper First, Then Topics

**Current**: Flat grid of 10 topic cards (Polity, Economy, etc.) with no GS Paper grouping.
**Vansh's ask**: Students think in GS-1/2/3/4. The page should reflect that hierarchy.

**Change `src/pages/SyllabusPage.tsx`**:
- Replace flat topic grid with a **GS Paper accordion/section layout**:
  - GS-1 (History, Society, Geography)
  - GS-2 (Polity, Governance, IR)
  - GS-3 (Economy, S&T, Environment)
  - GS-4 (Ethics)
- Each GS section shows its child topics as cards
- Tapping a topic → article list (existing drill-down behavior)
- Show article counts per GS paper as header stats

This is the "no-brainer" change Vansh explicitly called out.

---

### Task 2: Add Bookmark + Revision Actions to Issue Page

**Current**: `IssuePage.tsx` has no bookmark or "add to revision" buttons.
**Vansh's ask**: Every article should have bookmark + revision queue mechanics.

**Change `src/pages/IssuePage.tsx`**:
- Add a sticky bottom bar or top-right actions with:
  - Bookmark button (reuse existing bookmark mutation pattern from `IssueCard.tsx`)
  - "Add to Revision" button (adds MCQs from this article to spaced_cards)
- Both require auth — show toast if not logged in

---

### Task 3: Tighten Learn → Practice Flow on Issue Page

**Current**: Issue page shows MCQs inline but there's no explicit CTA to practice more or link back to daily quiz.
**Vansh's ask**: "Practice ko reading ke neeche chipkao" — practice should be embedded, not a separate destination.

**Change `src/pages/IssuePage.tsx`**:
- After the MCQs section, add a CTA card: **"Practice more on [topic]"** linking to `/practice` with the topic pre-selected
- After FAQs, add: **"Add these to your revision queue"** one-tap button that bulk-adds all MCQs from this article to spaced_cards

---

### Task 4: Show "For Prelims" / "For Mains" Strip More Prominently

**Current**: `IssuePage.tsx` already shows `prelims_keywords` and `syllabus_tags` in a glass-card, but it's subtle and placed after the header.
**Vansh's ask**: This should be the first thing students see after the title — matching Drishti's immediate exam-frame.

**Change `src/pages/IssuePage.tsx`**:
- Move the Prelims/Mains strip to directly below the title (before "Why in News")
- Make it visually distinct: colored left-border accent, slightly larger text
- Add GS Paper badges if not already showing

This is already partially done — just needs repositioning and visual emphasis.

---

### Task 5: Add "Revise" Tab to Mobile Nav (Promote from "More")

**Current**: Revision is buried in the "More" sheet on mobile. Students need daily access.
**Vansh's ask**: The core loop is Learn → Practice → Revise. Revise should be one tap away.

**Change `src/components/layout/MobileNav.tsx`**:
- Replace 3-tab + More with **4 primary tabs**: Today, Practice, Revise, Syllabus
- Move remaining items (Search, Saved, Dashboard, Settings) to "More" or keep in desktop nav only

---

### Task 6: Clear "Today's CA Quiz" vs "Topic Practice" Copy

**Current**: Already renamed in last iteration. Labels are good.
**Vansh's ask**: Validates this separation — keep it clear.

**No code change needed** — already done. Just verify copy is consistent.

---

### Files Changed
- `src/pages/SyllabusPage.tsx` — GS Paper hierarchy restructure
- `src/pages/IssuePage.tsx` — bookmark/revision actions, practice CTA, Prelims/Mains strip repositioning
- `src/components/layout/MobileNav.tsx` — promote Revise to primary nav

### What We're NOT Doing (per Ajay + Vansh)
- No mains answer evaluation (future paid feature)
- No PYQ database (needs curated dataset)
- No YouTube integration (future funnel)
- No new modules — just tightening the existing core loop

