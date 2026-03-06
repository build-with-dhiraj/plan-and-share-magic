import { useState, useMemo, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Trophy, Flame, ArrowLeft, Zap, Calendar, Crown, Medal,
  ChevronRight, Star, Clock, CheckCircle2, Lock
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { sampleMCQs, type MCQ } from "@/data/sampleMCQs";
import { QuizQuestion } from "@/components/practice/QuizQuestion";
import { cn } from "@/lib/utils";
import { useQuizPersist } from "@/hooks/useQuizPersist";
import { fetchMCQs } from "@/hooks/useMCQBank";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type ChallengeState = "lobby" | "active" | "complete";

interface LeaderboardEntry {
  rank: number;
  name: string;
  score: number;
  xp: number;
  time: number; // seconds
  streak: number;
  isYou?: boolean;
}

const DAILY_Q_COUNT = 5;
const COMPLETION_BONUS = 25;

// Deterministic daily seed from date
function getDailySeed(): number {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr];
  let s = seed;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 16807 + 0) % 2147483647;
    const j = s % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function getDailyQuestions(): Promise<MCQ[]> {
  const seed = getDailySeed();
  // Try DB first, fallback to sample
  const dbMCQs = await fetchMCQs({ dailyEligible: true, limit: 50 });
  const pool = dbMCQs.length >= DAILY_Q_COUNT ? dbMCQs : sampleMCQs;
  return seededShuffle(pool, seed).slice(0, DAILY_Q_COUNT);
}

function getTodayKey() {
  const d = new Date();
  return `daily-${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

// Fallback leaderboard (used while loading)
const FALLBACK_LEADERBOARD: LeaderboardEntry[] = [];

const rankIcons = [Crown, Medal, Medal];
const rankColors = ["text-accent", "text-muted-foreground", "text-[hsl(var(--gs-history))]"];

const DailyChallengePage = () => {
  const [state, setState] = useState<ChallengeState>("lobby");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<{ selected: number; correct: boolean; xp: number }[]>([]);
  const [streak, setStreak] = useState(0);
  const [totalXP, setTotalXP] = useState(0);
  const [completedToday, setCompletedToday] = useState(false);

  // Fetch real leaderboard from DB
  const { data: dbLeaderboard = [] } = useQuery({
    queryKey: ["daily-leaderboard"],
    queryFn: async () => {
      const { data } = await supabase
        .from("daily_leaderboard")
        .select("*")
        .order("rank", { ascending: true })
        .limit(10);
      return (data ?? []).map((e: any) => ({
        rank: Number(e.rank),
        name: e.display_name || "Anonymous",
        score: e.score ?? 0,
        xp: e.total_xp ?? 0,
        time: 0,
        streak: 0,
        isYou: false,
      })) as LeaderboardEntry[];
    },
  });

  useEffect(() => {
    getDailyQuestions().then(setQuestions);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem(getTodayKey());
    if (saved) setCompletedToday(true);
  }, []);

  const startChallenge = useCallback(() => {
    if (completedToday) return;
    setCurrentIndex(0);
    setAnswers([]);
    setStreak(0);
    setTotalXP(0);
    setState("active");
  }, [completedToday]);

  const { saveQuizResult, saveDailyCompletion } = useQuizPersist();

  const handleAnswer = useCallback((selectedIndex: number, isCorrect: boolean, xpEarned: number) => {
    setAnswers((prev) => [...prev, { selected: selectedIndex, correct: isCorrect, xp: xpEarned }]);
    setTotalXP((prev) => prev + xpEarned);
    setStreak((prev) => (isCorrect ? prev + 1 : 0));
  }, []);

  const handleNext = useCallback(() => {
    if (currentIndex + 1 >= questions.length) {
      const bonus = COMPLETION_BONUS;
      const finalXP = totalXP + bonus;
      setTotalXP(finalXP);
      localStorage.setItem(getTodayKey(), JSON.stringify({ xp: finalXP, answers: answers.length }));
      setCompletedToday(true);

      // Persist to Cloud
      const correctCount = answers.filter(a => a.correct).length;
      saveQuizResult({
        quizType: "daily_challenge",
        topic: null,
        totalQuestions: questions.length,
        correctAnswers: correctCount,
        totalXP: finalXP,
        bestStreak: streak,
        timedMode: true,
        answers: questions.map((q, i) => ({
          questionId: q.id,
          selectedIndex: answers[i]?.selected ?? -1,
          isCorrect: answers[i]?.correct ?? false,
          xpEarned: answers[i]?.xp ?? 0,
        })),
      }).then((attemptId) => {
        saveDailyCompletion(attemptId, correctCount, finalXP, bonus);
      });

      setState("complete");
    } else {
      setCurrentIndex((i) => i + 1);
    }
  }, [currentIndex, questions.length, totalXP, answers, questions, streak, saveQuizResult, saveDailyCompletion]);

  const correctCount = answers.filter((a) => a.correct).length;

  // Build leaderboard with user inserted
  const leaderboard = useMemo(() => {
    if (state !== "complete") return MOCK_LEADERBOARD;
    const userEntry: LeaderboardEntry = {
      rank: 0,
      name: "You",
      score: correctCount,
      xp: totalXP,
      time: 0,
      streak,
      isYou: true,
    };
    const all = [...MOCK_LEADERBOARD, userEntry].sort((a, b) => b.xp - a.xp);
    return all.map((e, i) => ({ ...e, rank: i + 1 }));
  }, [state, correctCount, totalXP, streak]);

  const todayDate = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });

  return (
    <div className="container max-w-2xl py-5 px-4 pb-24 lg:pb-6">
      <AnimatePresence mode="wait">
        {state === "lobby" && (
          <motion.div
            key="lobby"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-5"
          >
            {/* Hero */}
            <div className="glass-card rounded-2xl p-5 text-center space-y-3 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-transparent to-primary/5 pointer-events-none" />
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.1 }}
                className="mx-auto h-16 w-16 rounded-2xl bg-accent/15 flex items-center justify-center"
              >
                <Trophy className="h-8 w-8 text-accent" />
              </motion.div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Daily Challenge</h1>
                <p className="text-sm text-muted-foreground flex items-center justify-center gap-1.5 mt-1">
                  <Calendar className="h-3.5 w-3.5" /> {todayDate}
                </p>
              </div>
              <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 text-accent" /> {DAILY_Q_COUNT} Questions
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" /> Timed
                </span>
                <span className="flex items-center gap-1">
                  <Zap className="h-3.5 w-3.5 text-accent" /> +{COMPLETION_BONUS} Bonus XP
                </span>
              </div>

              {completedToday ? (
                <div className="flex items-center justify-center gap-2 text-sm font-medium text-[hsl(var(--gs-economy))]">
                  <CheckCircle2 className="h-4 w-4" /> Completed today!
                </div>
              ) : (
                <Button onClick={startChallenge} className="w-full h-12 text-sm font-semibold gap-2 relative z-10">
                  <Flame className="h-4 w-4" /> Start Today's Challenge
                </Button>
              )}
            </div>

            {/* Rules */}
            <div className="glass-card rounded-xl p-4 space-y-2.5">
              <h2 className="text-sm font-semibold text-foreground">How it works</h2>
              <div className="space-y-2">
                {[
                  { icon: Star, text: "5 curated questions refreshed daily" },
                  { icon: Clock, text: "60 seconds per question — speed earns bonus XP" },
                  { icon: Zap, text: `+${COMPLETION_BONUS} XP bonus for completing the set` },
                  { icon: Trophy, text: "Compete on the daily leaderboard" },
                ].map((r, i) => (
                  <div key={i} className="flex items-center gap-2.5 text-xs text-muted-foreground">
                    <r.icon className="h-3.5 w-3.5 text-accent shrink-0" />
                    <span>{r.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Leaderboard Preview */}
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Crown className="h-4 w-4 text-accent" /> Today's Leaderboard
              </h2>
              <div className="glass-card rounded-xl divide-y divide-border overflow-hidden">
                {MOCK_LEADERBOARD.slice(0, 5).map((entry) => (
                  <LeaderboardRow key={entry.rank} entry={entry} />
                ))}
              </div>
              {completedToday && (
                <p className="text-xs text-center text-muted-foreground">
                  Complete today's challenge to see your rank
                </p>
              )}
            </div>
          </motion.div>
        )}

        {state === "active" && questions[currentIndex] && (
          <motion.div
            key={`active-${currentIndex}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Top bar */}
            <div className="flex items-center gap-3 mb-4">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => setState("lobby")}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex-1 space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Trophy className="h-3 w-3 text-accent" /> Daily Challenge
                  </span>
                  <span className="flex items-center gap-1.5">
                    {totalXP > 0 && (
                      <span className="flex items-center gap-0.5 text-accent font-semibold">
                        <Zap className="h-3 w-3" />{totalXP}
                      </span>
                    )}
                    {correctCount}/{answers.length} correct
                  </span>
                </div>
                <Progress value={((currentIndex + 1) / questions.length) * 100} className="h-1.5" />
              </div>
            </div>

            <QuizQuestion
              key={questions[currentIndex].id}
              mcq={questions[currentIndex]}
              questionNumber={currentIndex + 1}
              totalQuestions={questions.length}
              onAnswer={handleAnswer}
              onNext={handleNext}
              timedMode={true}
              timeLimit={60}
              currentStreak={streak}
            />
          </motion.div>
        )}

        {state === "complete" && (
          <motion.div
            key="complete"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-5"
          >
            <div className="flex items-center gap-3 mb-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setState("lobby")}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h1 className="text-lg font-bold text-foreground">Challenge Complete!</h1>
            </div>

            {/* Score Card */}
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring" }}
              className="glass-card rounded-2xl p-5 text-center space-y-4 relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-transparent to-[hsl(var(--gs-economy))]/5 pointer-events-none" />
              <motion.div
                initial={{ rotate: -180, scale: 0 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ type: "spring", delay: 0.2 }}
              >
                <Trophy className="h-12 w-12 text-accent mx-auto" />
              </motion.div>

              <div>
                <p className="text-3xl font-bold text-foreground">{correctCount}/{questions.length}</p>
                <p className="text-sm text-muted-foreground">Questions Correct</p>
              </div>

              <div className="flex items-center justify-center gap-6">
                <div className="text-center">
                  <p className="text-lg font-bold text-accent flex items-center gap-1 justify-center">
                    <Zap className="h-4 w-4" /> {totalXP}
                  </p>
                  <p className="text-[11px] text-muted-foreground">Total XP</p>
                </div>
                <div className="w-px h-8 bg-border" />
                <div className="text-center">
                  <p className="text-lg font-bold text-[hsl(var(--gs-economy))] flex items-center gap-1 justify-center">
                    <Zap className="h-4 w-4" /> +{COMPLETION_BONUS}
                  </p>
                  <p className="text-[11px] text-muted-foreground">Bonus XP</p>
                </div>
                <div className="w-px h-8 bg-border" />
                <div className="text-center">
                  <p className="text-lg font-bold text-foreground flex items-center gap-1 justify-center">
                    <Flame className="h-4 w-4 text-destructive" /> {streak}
                  </p>
                  <p className="text-[11px] text-muted-foreground">Best Streak</p>
                </div>
              </div>
            </motion.div>

            {/* Leaderboard */}
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Crown className="h-4 w-4 text-accent" /> Today's Leaderboard
              </h2>
              <div className="glass-card rounded-xl divide-y divide-border overflow-hidden">
                {leaderboard.map((entry) => (
                  <LeaderboardRow key={`${entry.name}-${entry.rank}`} entry={entry} />
                ))}
              </div>
            </div>

            <Button
              onClick={() => setState("lobby")}
              variant="outline"
              className="w-full h-11 text-sm font-semibold"
            >
              Back to Challenge
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

function LeaderboardRow({ entry }: { entry: LeaderboardEntry }) {
  const RankIcon = entry.rank <= 3 ? rankIcons[entry.rank - 1] : null;
  const rankColor = entry.rank <= 3 ? rankColors[entry.rank - 1] : "";

  return (
    <motion.div
      initial={entry.isYou ? { backgroundColor: "hsl(var(--accent) / 0.15)" } : {}}
      animate={entry.isYou ? { backgroundColor: ["hsl(var(--accent) / 0.15)", "hsl(var(--accent) / 0.05)"] } : {}}
      transition={{ duration: 1.5 }}
      className={cn(
        "flex items-center gap-3 px-4 py-3",
        entry.isYou && "bg-accent/10"
      )}
    >
      <div className="w-7 text-center shrink-0">
        {RankIcon ? (
          <RankIcon className={cn("h-5 w-5 mx-auto", rankColor)} />
        ) : (
          <span className="text-xs font-semibold text-muted-foreground">#{entry.rank}</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm font-medium truncate", entry.isYou ? "text-accent font-semibold" : "text-foreground")}>
          {entry.name} {entry.isYou && <Badge className="ml-1 text-[9px] bg-accent/20 text-accent border-accent/30">You</Badge>}
        </p>
      </div>
      <div className="flex items-center gap-3 text-xs shrink-0">
        <span className="text-muted-foreground">{entry.score}/{DAILY_Q_COUNT}</span>
        <span className="font-semibold text-accent flex items-center gap-0.5">
          <Zap className="h-3 w-3" />{entry.xp}
        </span>
      </div>
    </motion.div>
  );
}

export default DailyChallengePage;
