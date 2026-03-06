

## AI Mentor Chat — Build Plan

The user provided Azure OpenAI credentials (endpoint, API key, deployment `gpt-4.1`) to power the mentor. The plan builds a streaming RAG chat that pulls context from the user's weak topics and cites sources from the content pipeline.

### Architecture

```text
MentorPage (React)
  ↓ SSE stream
Edge Function: mentor-chat
  ├─ Query user's weak topics (quiz_answers → lowest accuracy topics)
  ├─ Fetch relevant facts + articles from DB matching query + weak topics
  ├─ Build system prompt with RAG context + citations
  └─ Stream response from Azure OpenAI (gpt-4.1)
```

### Step 1: Store Azure OpenAI secrets

Use `add_secret` to store:
- `AZURE_OPENAI_ENDPOINT` 
- `AZURE_OPENAI_API_KEY`
- `AZURE_OPENAI_DEPLOYMENT` (gpt-4.1)
- `AZURE_OPENAI_API_VERSION` (2024-12-01-preview)

### Step 2: Create `supabase/functions/mentor-chat/index.ts`

Edge function that:
1. Receives `{ messages, user_id }` from the client
2. Queries `quiz_answers` joined with `mcq_bank` to find the user's weakest topics (lowest accuracy)
3. Searches `facts` and `articles` tables using the user's latest message text + weak topics via `ilike` matching on `fact_text`, `title`, and `syllabus_tags`
4. Constructs a system prompt injecting:
   - RAG context: up to 15 relevant facts with source URLs
   - User's weak topics for personalized emphasis
   - Instruction to cite sources inline using `[Source: title](url)` format
   - UPSC-focused persona (Prelims + Mains aware)
5. Calls Azure OpenAI Chat Completions API with streaming enabled
6. Proxies the SSE stream back to the client
7. Handles 429/402 errors gracefully

### Step 3: Create `src/hooks/useMentorChat.ts`

Custom hook managing:
- `messages` state (user + assistant)
- `streamChat()` function using SSE line-by-line parsing
- `isLoading` state
- Sends full conversation history on each call
- Handles error toasts for rate limits

### Step 4: Rebuild `src/pages/MentorPage.tsx`

Full chat UI with:
- Scrollable message list with markdown rendering (using a simple markdown-to-JSX approach since `react-markdown` isn't installed — or we install it)
- Suggestion chips that pre-fill input
- Auto-scroll to bottom on new tokens
- User/assistant message bubbles with avatar icons
- Loading indicator (typing dots animation)
- Input bar pinned to bottom with send button
- Citations rendered as clickable links within assistant messages

### Step 5: Update `supabase/config.toml`

Add `[functions.mentor-chat]` with `verify_jwt = true` (requires auth since we read user-specific data).

### Dependencies

- Will install `react-markdown` + `remark-gfm` for proper markdown rendering in chat messages
- No other new dependencies needed

### Security

- Azure API key stays server-side only in edge function
- JWT verification enabled — only authenticated users can chat
- User ID extracted from JWT on the server, not trusted from client

