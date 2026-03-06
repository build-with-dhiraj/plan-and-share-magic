
DROP VIEW IF EXISTS public.daily_leaderboard;

CREATE OR REPLACE VIEW public.daily_leaderboard
WITH (security_invoker = true)
AS
SELECT dc.user_id, p.display_name, p.avatar_url, dc.score, dc.total_xp, dc.challenge_date,
  RANK() OVER (PARTITION BY dc.challenge_date ORDER BY dc.total_xp DESC, dc.completed_at ASC) AS rank
FROM public.daily_completions dc
JOIN public.profiles p ON p.user_id = dc.user_id
WHERE dc.challenge_date = CURRENT_DATE;
