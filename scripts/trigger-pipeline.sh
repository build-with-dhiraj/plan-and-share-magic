#!/bin/bash
# Trigger the content pipeline to process the article backlog
# Usage: ./scripts/trigger-pipeline.sh [batch_size]
#
# This calls the pipeline-trigger edge function which:
# 1. Ingests new RSS articles
# 2. Processes unprocessed articles through the 3-step Drishti pipeline
#
# With the new relevance filter, low-quality articles will be triaged fast
# (no AI generation for junk/irrelevant articles)

BATCH_SIZE=${1:-20}
SUPABASE_URL="https://zblmdfoddvqlaadqhlkq.supabase.co"
# Replace with your service role key (not the anon key)
SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-YOUR_SERVICE_ROLE_KEY_HERE}"

echo "Triggering pipeline with batch_size=$BATCH_SIZE..."

curl -s -X POST \
  "${SUPABASE_URL}/functions/v1/pipeline-trigger" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
  -d "{\"batch_size\": ${BATCH_SIZE}}" | python3 -m json.tool 2>/dev/null || echo "(raw output above)"

echo ""
echo "Done. Run again to process more articles from the backlog."
