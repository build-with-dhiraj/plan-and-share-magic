import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, Shuffle, BookOpen, Flame, ArrowLeft, Timer, Zap, Trophy, Calendar, GraduationCap, ShieldCheck, CheckCircle2, RotateCcw, XCircle, Brain } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnimatePresence, motion } from "framer-motion";
import { sampleMCQs, type MCQ } from "@/data/sampleMCQs";
import { QuizQuestion } from "@/components/practice/QuizQuestion";
import { QuizResults } from "@/components/practice/QuizResults";
import { cn } from "@/lib/utils";
import { useQuizPersist } from "@/hooks/useQuizPersist";
import { fetchMCQs, fetchTopicCounts } from "@/hooks/useMCQBank";
import { fetchPYQsForPractice, fetchPYQYears, fetchPYQTopicCounts, savePYQAttempt, type PYQQuestion } from "@/hooks/usePYQBank";
import { useAuth } from "@/hooks/useAuth";
import { useSpacedRepetition } from "@/hooks/useSpacedRepetition";
import { XPStreakWidget } from "@/components/gamification/XPStreakWidget";

type QuizState = "menu" | "active" | "results";

const topicDefs = [
  { name: "Polity", cls: "gs-tag-polity" },
  { name: "Economy", cls: "gs-tag-economy" },
  { name: "Environment", cls: "gs-tag-environment" },
  { name: "Geography", cls: "gs-tag-geography" },
  { name: "IR", cls: "gs-tag-ir" },
  { name: "Science", cls: "gs-tag-science" },
  { name: "History", cls: "gs-tag-history" },
  { name: "Ethics", cls: "gs-tag-ethics" },
  { name: "Society", cls: "gs-tag-society" },
];

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const PracticePage = () => {
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const initialTab = tabParam === "pyq" ? "pyq" : tabParam === "revise" ? "revise" : "daily";
  const { user } = useAuth();

  // Spaced repetition (Revise sub-tab)
  const { dueCards, stats: revisionStats, reviewCard, refresh: refreshRevision } = useSpacedRepetition();
  const [reviseState, setReviseState] = useState<"queue" | "review" | "done">("queue");
  const [reviseIdx, setReviseIdx] = useState(0);
  const [reviseSelectedOption, setReviseSelectedOption] = useState<number | null>(null);
  const [reviseRevealed, setReviseRevealed] = useState(false);
  const [reviseReviewedCount, setReviseReviewedCount] = useState(0);

  const currentReviseCard = dueCards[reviseIdx];

  const startReviseSession = useCallback(() => {
    setReviseIdx(0);
    setReviseSelectedOption(null);
    setReviseRevealed(false);
    setReviseReviewedCount(0);
    setReviseState("review");
  }, []);

  const handleReviseOptionSelect = (index: number) => {
    if (reviseRevealed) return;
    setReviseSelectedOption(index);
    setReviseRevealed(true);
  };

  const handleReviseSubmit = async (quality: number) => {
    if (!currentReviseCard) return;
    await reviewCard(currentReviseCard.id, quality);
    setReviseReviewedCount((p) => p + 1);

    if (reviseIdx + 1 >= dueCards.length) {
      setReviseState("done");
    } else {
      setReviseIdx((i) => i + 1);
      setReviseSelectedOption(null);
      setReviseRevealed(false);
    }
  };

  const [quizState, setQuizState] = useState<QuizState>("menu");
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [questions, setQuestions] = useState<MCQ[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<{ selected: number; correct: boolean; xp: number }[]>([]);
  const [timedMode, setTimedMode] = useState(false);
  const [streak, setStreak] = useState(0);
  const [totalXP, setTotalXP] = useState(0);
  const [topicCounts, setTopicCounts] = useState<Record<string, number>>({});

  // PYQ-specific state
  const [pyqStage, setPyqStage] = useState<"prelims" | "mains" | null>(null);
  const [pyqYear, setPyqYear] = useState<number | null>(null);
  const [pyqGsPaper, setPyqGsPaper] = useState<string | null>(null);
  const [pyqQuestions, setPyqQuestions] = useState<PYQQuestion[]>([]);
  const [pyqIndex, setPyqIndex] = useState(0);
  const [pyqAnswers, setPyqAnswers] = useState<{ label: string; correct: boolean; xp: number }[]>([]);
  const [pyqState, setPyqState] = useState<QuizState>("menu");
  const [pyqYears, setPyqYears] = useState<number[]>([]);
  const [pyqTopicCounts, setPyqTopicCounts] = useState<Record<string, number>>({});
  const [pyqLoading, setPyqLoading] = useState(false);

  // Load topic counts from DB + fallback
  useEffect(() => {
    fetchTopicCounts().then(setTopicCounts);
    fetchPYQYears().then(setPyqYears);
    fetchPYQTopicCounts().then(setPyqTopicCounts);
  }, []);

  const topics = useMemo(() =>
    topicDefs.map((t) => ({ ...t, count: topicCounts[t.name] || 0 })),
    [topicCounts]
  );

  const startQuiz = useCallback(async (topic: string | null) => {
    const pool = await fetchMCQs({ topic, limit: 50 });
    const shuffled = shuffleArray(pool).slice(0, Math.min(10, pool.length));
    setSelectedTopic(topic);
    setQuestions(shuffled);
    setCurrentIndex(0);
    setAnswers([]);
    setStreak(0);
    setTotalXP(0);
    setQuizState("active");
  }, []);

  // PYQ practice start
  const startPyqPractice = useCallback(async () => {
    setPyqLoading(true);
    try {
      const pyqs = await fetchPYQsForPractice({
        exam_stage: pyqStage,
        year: pyqYear,
        gs_paper: pyqGsPaper,
        limit: 20,
      });
      if (pyqs.length === 0) {
        setPyqLoading(false);
        return;
      }
      const shuffled = shuffleArray(pyqs).slice(0, Math.min(10, pyqs.length));
      setPyqQuestions(shuffled);
      setPyqIndex(0);
      setPyqAnswers([]);
      setPyqState("active");
    } finally {
      setPyqLoading(false);
    }
  }, [pyqStage, pyqYear, pyqGsPaper]);

  const handlePyqAnswer = useCallback((label: string, correct: boolean, xp: number) => {
    setPyqAnswers((prev) => [...prev, { label, correct, xp }]);
    setTotalXP((prev) => prev + xp);
  }, []);

  const handlePyqNext = useCallback(() => {
    if (pyqIndex + 1 >= pyqQuestions.length) {
      // Save attempt
      if (user) {
        const correctCount = pyqAnswers.filter(a => a.correct).length;
        savePYQAttempt({
          userId: user.id,
          practiceType: pyqStage || "mixed",
          yearFilter: pyqYear ?? undefined,
          paperFilter: pyqGsPaper ?? undefined,
          totalQuestions: pyqQuestions.length,
          correctAnswers: correctCount,
          totalXP,
          answers: pyqQuestions.map((q, i) => ({
            pyqQuestionId: q.id,
            selectedOption: pyqAnswers[i]?.label,
            isCorrect: pyqAnswers[i]?.correct,
            xpEarned: pyqAnswers[i]?.xp ?? 0,
          })),
        });
      }
      setPyqState("results");
    } else {
      setPyqIndex((i) => i + 1);
    }
  }, [pyqIndex, pyqQuestions, pyqAnswers, user, pyqStage, pyqYear, pyqGsPaper, totalXP]);

  const { saveQuizResult } = useQuizPersist();
  const answersRef = useRef<{ questionId: string; selected: number; correct: boolean; xp: number }[]>([]);

  const handleAnswer = useCallback((selectedIndex: number, isCorrect: boolean, xpEarned: number) => {
    setAnswers((prev) => [...prev, { selected: selectedIndex, correct: isCorrect, xp: xpEarned }]);
    setTotalXP((prev) => prev + xpEarned);
    setStreak((prev) => isCorrect ? prev + 1 : 0);
  }, []);

  const handleNext = useCallback(() => {
    if (currentIndex + 1 >= questions.length) {
      // Persist to Cloud
      const finalAnswers = [...answers, answers[answers.length - 1]]; // answers already updated by handleAnswer
      saveQuizResult({
        quizType: selectedTopic ? "topic_drill" : "practice",
        topic: selectedTopic,
        totalQuestions: questions.length,
        correctAnswers: answers.filter(a => a.correct).length,
        totalXP,
        bestStreak: streak,
        timedMode,
        answers: questions.map((q, i) => ({
          questionId: q.id,
          selectedIndex: answers[i]?.selected ?? -1,
          isCorrect: answers[i]?.correct ?? false,
          xpEarned: answers[i]?.xp ?? 0,
        })),
      });
      setQuizState("results");
    } else {
      setCurrentIndex((i) => i + 1);
    }
  }, [currentIndex, questions.length, answers, questions, saveQuizResult, selectedTopic, totalXP, streak, timedMode]);

  const topicBreakdown = useMemo(() => {
    const breakdown: Record<string, { correct: number; total: number }> = {};
    questions.forEach((q, i) => {
      if (i >= answers.length) return;
      if (!breakdown[q.topic]) breakdown[q.topic] = { correct: 0, total: 0 };
      breakdown[q.topic].total++;
      if (answers[i].correct) breakdown[q.topic].correct++;
    });
    return breakdown;
  }, [questions, answers]);

  const correctCount = answers.filter((a) => a.correct).length;

  return (
    <div className="container max-w-2xl py-5 px-4 pb-24 lg:pb-6">
      <AnimatePresence mode="wait">
        {quizState === "menu" && (
          <motion.div
            key="menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight mb-1">Practice</h1>
            <p className="text-sm text-muted-foreground mb-4">UPSC-format MCQ drills to sharpen recall</p>

            <Tabs defaultValue={initialTab} className="w-full">
              <TabsList className="w-full grid grid-cols-4 mb-4">
                <TabsTrigger value="daily" className="text-xs sm:text-sm gap-1">
                  <Trophy className="h-3.5 w-3.5" /> Daily
                </TabsTrigger>
                <TabsTrigger value="pyq" className="text-xs sm:text-sm gap-1">
                  <GraduationCap className="h-3.5 w-3.5" /> PYQ
                </TabsTrigger>
                <TabsTrigger value="topic" className="text-xs sm:text-sm gap-1">
                  <Target className="h-3.5 w-3.5" /> Topic
                </TabsTrigger>
                <TabsTrigger value="revise" className="text-xs sm:text-sm gap-1">
                  <RotateCcw className="h-3.5 w-3.5" /> Revise
                  {revisionStats.dueToday > 0 && (
                    <span className="ml-0.5 h-4 min-w-[16px] px-1 rounded-full bg-accent text-[10px] font-bold text-accent-foreground flex items-center justify-center">
                      {revisionStats.dueToday}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="daily">
                <Link to="/daily" className="block">
                  <div className="glass-card rounded-xl p-5 text-center space-y-3 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-transparent to-primary/5 pointer-events-none" />
                    <Trophy className="h-12 w-12 text-accent mx-auto relative" />
                    <div className="relative">
                      <h2 className="text-lg font-bold text-foreground">Daily UPSC Quiz</h2>
                      <p className="text-sm text-muted-foreground mt-1">
                        5 MCQs from today's current affairs
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center justify-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" })}
                      </p>
                    </div>
                    <Button className="w-full h-11 text-sm font-semibold gap-2 relative">
                      <Flame className="h-4 w-4" /> Start Today's Quiz
                    </Button>
                  </div>
                </Link>
              </TabsContent>

              <TabsContent value="pyq" className="space-y-4">
                <div className="glass-card rounded-xl p-5 space-y-4 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-accent/5 pointer-events-none" />
                  <div className="relative space-y-4">
                    <div className="text-center">
                      <GraduationCap className="h-10 w-10 text-green-600 mx-auto mb-2" />
                      <h2 className="text-lg font-bold text-foreground">Official UPSC PYQ Practice</h2>
                      <p className="text-sm text-muted-foreground mt-1">
                        Solve actual past UPSC questions
                      </p>
                    </div>

                    {/* Stage filter */}
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase mb-1.5">Stage</p>
                      <div className="flex gap-2">
                        {[
                          { label: "All Papers", value: null },
                          { label: "Prelims", value: "prelims" as const },
                          { label: "Mains", value: "mains" as const },
                        ].map((opt) => (
                          <button
                            key={opt.label}
                            onClick={() => setPyqStage(opt.value)}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                              pyqStage === opt.value
                                ? "bg-accent text-accent-foreground border-accent"
                                : "bg-transparent text-muted-foreground border-border hover:bg-muted/50"
                            )}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* GS Paper filter */}
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase mb-1.5">GS Paper</p>
                      <div className="flex flex-wrap gap-1.5">
                        {[null, "GS-1", "GS-2", "GS-3", "GS-4"].map((gs) => (
                          <button
                            key={gs ?? "all"}
                            onClick={() => setPyqGsPaper(gs)}
                            className={cn(
                              "px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors",
                              pyqGsPaper === gs
                                ? "bg-accent text-accent-foreground border-accent"
                                : "bg-transparent text-muted-foreground border-border hover:bg-muted/50"
                            )}
                          >
                            {gs ?? "All"}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Year filter */}
                    {pyqYears.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase mb-1.5">Year</p>
                        <div className="flex flex-wrap gap-1.5">
                          <button
                            onClick={() => setPyqYear(null)}
                            className={cn(
                              "px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors",
                              pyqYear === null
                                ? "bg-accent text-accent-foreground border-accent"
                                : "bg-transparent text-muted-foreground border-border hover:bg-muted/50"
                            )}
                          >
                            All
                          </button>
                          {pyqYears.slice(0, 10).map((y) => (
                            <button
                              key={y}
                              onClick={() => setPyqYear(y)}
                              className={cn(
                                "px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors",
                                pyqYear === y
                                  ? "bg-accent text-accent-foreground border-accent"
                                  : "bg-transparent text-muted-foreground border-border hover:bg-muted/50"
                              )}
                            >
                              {y}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* PYQ topic counts */}
                    {Object.keys(pyqTopicCounts).length > 0 && (
                      <div className="text-xs text-muted-foreground">
                        {Object.entries(pyqTopicCounts).slice(0, 5).map(([t, c]) => (
                          <span key={t} className="mr-3">{t}: {c}Q</span>
                        ))}
                      </div>
                    )}

                    <Button
                      onClick={startPyqPractice}
                      disabled={pyqLoading}
                      className="w-full h-11 text-sm font-semibold gap-2"
                    >
                      <ShieldCheck className="h-4 w-4" />
                      {pyqLoading ? "Loading PYQs..." : "Start PYQ Practice"}
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="topic" className="space-y-4">
                {/* Timed Mode Toggle */}
                <motion.div
                  className="glass-card rounded-xl p-3.5 flex items-center justify-between"
                  whileTap={{ scale: 0.99 }}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={cn(
                      "h-8 w-8 rounded-lg flex items-center justify-center",
                      timedMode ? "bg-accent/20" : "bg-muted"
                    )}>
                      <Timer className={cn("h-4 w-4", timedMode ? "text-accent" : "text-muted-foreground")} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Timed Mode</p>
                      <p className="text-[11px] text-muted-foreground">
                        {timedMode ? "60s per question • -5 XP penalty for wrong" : "Untimed • No penalty"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setTimedMode(!timedMode)}
                    className={cn(
                      "relative h-7 w-12 rounded-full transition-colors duration-200",
                      timedMode ? "bg-accent" : "bg-border"
                    )}
                  >
                    <motion.div
                      className="absolute top-0.5 h-6 w-6 rounded-full bg-card shadow-sm"
                      animate={{ left: timedMode ? 22 : 2 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  </button>
                </motion.div>

                {/* Quick Drill CTA */}
                <div className="glass-card rounded-xl overflow-hidden p-4 space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Pick a syllabus topic or start a random drill
                  </p>
                  <Button onClick={() => startQuiz(null)} className="w-full h-11 gap-2 text-sm font-semibold">
                    <Shuffle className="h-4 w-4" /> Start {timedMode ? "Timed" : "Random"} Drill
                  </Button>
                </div>

                {/* Topic grid */}
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-accent" /> Practice by Topic
                </h2>
                <div className="grid grid-cols-2 gap-2.5">
                  {topics.map((topic) => (
                    <motion.button
                      key={topic.name}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => topic.count > 0 && startQuiz(topic.name)}
                      disabled={topic.count === 0}
                      className={cn(
                        "glass-card rounded-xl p-4 text-left transition-shadow hover:shadow-md",
                        topic.count === 0 && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <Badge className={cn("border text-[10px]", topic.cls)}>{topic.name}</Badge>
                        <span className="text-xs text-muted-foreground">{topic.count}Q</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {topic.count > 0 ? "Tap to start" : "Coming soon"}
                      </p>
                    </motion.button>
                  ))}
                </div>
              </TabsContent>

              {/* ── Revise (SM-2 Spaced Repetition) ── */}
              <TabsContent value="revise">
                <AnimatePresence mode="wait">
                  {reviseState === "queue" && (
                    <motion.div key="revise-queue" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <Card className="glass-card mb-4">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base flex items-center gap-2">
                            <RotateCcw className="h-4 w-4 text-accent" /> Today's Review Queue
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {revisionStats.loading ? (
                            <p className="text-sm text-muted-foreground">Loading…</p>
                          ) : revisionStats.dueToday === 0 ? (
                            <div className="text-center py-4">
                              <CheckCircle2 className="h-8 w-8 text-accent mx-auto mb-2" />
                              <p className="text-sm font-medium text-foreground">All caught up!</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                No cards due. Practice quizzes & get questions wrong to build your review queue.
                              </p>
                            </div>
                          ) : (
                            <>
                              <p className="text-sm text-muted-foreground mb-4">
                                {revisionStats.dueToday} card{revisionStats.dueToday !== 1 ? "s" : ""} due for review
                              </p>
                              <Button onClick={startReviseSession} className="w-full bg-primary text-primary-foreground">
                                <Flame className="h-4 w-4 mr-2" /> Start Review Session
                              </Button>
                            </>
                          )}
                        </CardContent>
                      </Card>

                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { label: "Due Today", value: revisionStats.loading ? "…" : String(revisionStats.dueToday), color: "text-accent", icon: Brain },
                          { label: "Reviewed", value: revisionStats.loading ? "…" : String(revisionStats.reviewedToday), color: "text-[hsl(var(--gs-economy))]", icon: RotateCcw },
                          { label: "Mastered", value: revisionStats.loading ? "…" : String(revisionStats.mastered), color: "text-[hsl(var(--gs-polity))]", icon: Trophy },
                        ].map((stat) => (
                          <Card key={stat.label} className="glass-card text-center p-4">
                            <stat.icon className={cn("h-4 w-4 mx-auto mb-1", stat.color)} />
                            <p className={cn("text-2xl font-bold", stat.color)}>{stat.value}</p>
                            <p className="text-xs text-muted-foreground">{stat.label}</p>
                          </Card>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {reviseState === "review" && currentReviseCard && (
                    <motion.div
                      key={`revise-review-${reviseIdx}`}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                    >
                      <div className="flex items-center gap-3 mb-4">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setReviseState("queue")}>
                          <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <div className="flex-1">
                          <p className="text-xs text-muted-foreground">
                            Card {reviseIdx + 1} of {dueCards.length}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-[10px]">
                          Interval: {currentReviseCard.interval_days}d
                        </Badge>
                      </div>

                      <Card className="glass-card mb-4">
                        <CardContent className="p-5">
                          <Badge className="mb-3 text-[10px]">{currentReviseCard.mcq.topic}</Badge>
                          <p className="text-base font-medium text-foreground leading-relaxed mb-1">
                            {currentReviseCard.mcq.question}
                          </p>
                          {currentReviseCard.mcq.statements && (
                            <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1 mt-2 mb-3">
                              {currentReviseCard.mcq.statements.map((s: string, i: number) => (
                                <li key={i}>{s}</li>
                              ))}
                            </ol>
                          )}

                          <div className="space-y-2 mt-4">
                            {currentReviseCard.mcq.options.map((opt: string, i: number) => {
                              const isCorrect = i === currentReviseCard.mcq.correctIndex;
                              const isSelected = reviseSelectedOption === i;
                              return (
                                <button
                                  key={i}
                                  onClick={() => handleReviseOptionSelect(i)}
                                  disabled={reviseRevealed}
                                  className={cn(
                                    "w-full text-left p-3 rounded-xl text-sm border transition-all",
                                    !reviseRevealed && "hover:bg-accent/5 border-border",
                                    reviseRevealed && isCorrect && "border-[hsl(var(--gs-economy))] bg-[hsl(var(--gs-economy))]/10",
                                    reviseRevealed && isSelected && !isCorrect && "border-destructive bg-destructive/10",
                                    reviseRevealed && !isSelected && !isCorrect && "opacity-50 border-border"
                                  )}
                                >
                                  <span className="flex items-center gap-2">
                                    <span className="text-muted-foreground text-xs font-mono w-5">
                                      {String.fromCharCode(65 + i)}.
                                    </span>
                                    <span className={cn(reviseRevealed && isCorrect && "font-semibold text-foreground")}>
                                      {opt}
                                    </span>
                                    {reviseRevealed && isCorrect && <CheckCircle2 className="h-4 w-4 text-[hsl(var(--gs-economy))] ml-auto shrink-0" />}
                                    {reviseRevealed && isSelected && !isCorrect && <XCircle className="h-4 w-4 text-destructive ml-auto shrink-0" />}
                                  </span>
                                </button>
                              );
                            })}
                          </div>

                          {reviseRevealed && (
                            <motion.div
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="mt-4 p-3 bg-muted/50 rounded-xl"
                            >
                              <p className="text-xs font-semibold text-foreground mb-1">Explanation</p>
                              <p className="text-xs text-muted-foreground leading-relaxed">
                                {currentReviseCard.mcq.explanation}
                              </p>
                            </motion.div>
                          )}
                        </CardContent>
                      </Card>

                      {reviseRevealed && (
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="space-y-2"
                        >
                          <p className="text-xs text-muted-foreground text-center mb-2">How well did you recall this?</p>
                          <div className="grid grid-cols-3 gap-2">
                            <Button
                              variant="outline"
                              onClick={() => handleReviseSubmit(1)}
                              className="border-destructive/30 text-destructive hover:bg-destructive/10"
                            >
                              <XCircle className="h-4 w-4 mr-1" /> Forgot
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => handleReviseSubmit(3)}
                              className="border-accent/30 text-accent hover:bg-accent/10"
                            >
                              <Brain className="h-4 w-4 mr-1" /> Hard
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => handleReviseSubmit(5)}
                              className="border-[hsl(var(--gs-economy))]/30 text-[hsl(var(--gs-economy))] hover:bg-[hsl(var(--gs-economy))]/10"
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1" /> Easy
                            </Button>
                          </div>
                        </motion.div>
                      )}
                    </motion.div>
                  )}

                  {reviseState === "done" && (
                    <motion.div
                      key="revise-done"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-center py-12"
                    >
                      <motion.div
                        initial={{ rotate: -180, scale: 0 }}
                        animate={{ rotate: 0, scale: 1 }}
                        transition={{ type: "spring", delay: 0.1 }}
                      >
                        <Trophy className="h-16 w-16 text-accent mx-auto mb-4" />
                      </motion.div>
                      <h2 className="text-xl font-bold text-foreground mb-2">Session Complete!</h2>
                      <p className="text-sm text-muted-foreground mb-6">
                        You reviewed {reviseReviewedCount} card{reviseReviewedCount !== 1 ? "s" : ""}
                      </p>
                      <Button variant="outline" onClick={() => { refreshRevision(); setReviseState("queue"); }}>
                        Back to Queue
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </TabsContent>
            </Tabs>
          </motion.div>
        )}

        {quizState === "active" && questions[currentIndex] && (
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
                onClick={() => setQuizState("menu")}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex-1 space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    {selectedTopic || "Mixed"} Drill
                    {timedMode && <Timer className="h-3 w-3 text-accent" />}
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
              timedMode={timedMode}
              timeLimit={60}
              currentStreak={streak}
            />
          </motion.div>
        )}

        {quizState === "results" && (
          <motion.div
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setQuizState("menu")}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h1 className="text-lg font-bold text-foreground">Quiz Complete</h1>
            </div>

            <QuizResults
              correct={correctCount}
              total={questions.length}
              totalXP={totalXP}
              topicBreakdown={topicBreakdown}
              timedMode={timedMode}
              onRetry={() => startQuiz(selectedTopic)}
              onNewQuiz={() => setQuizState("menu")}
            />
          </motion.div>
        )}

        {/* PYQ Active Quiz */}
        {pyqState === "active" && pyqQuestions[pyqIndex] && (
          <motion.div
            key={`pyq-active-${pyqIndex}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setPyqState("menu")}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex-1 space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="h-3 w-3 text-green-600" />
                    PYQ {pyqQuestions[pyqIndex].year} {pyqQuestions[pyqIndex].paper_code.toUpperCase()}
                  </span>
                  <span>{pyqAnswers.filter(a => a.correct).length}/{pyqAnswers.length} correct</span>
                </div>
                <Progress value={((pyqIndex + 1) / pyqQuestions.length) * 100} className="h-1.5" />
              </div>
            </div>

            <PYQQuizCard
              pyq={pyqQuestions[pyqIndex]}
              questionNumber={pyqIndex + 1}
              totalQuestions={pyqQuestions.length}
              onAnswer={handlePyqAnswer}
              onNext={handlePyqNext}
            />
          </motion.div>
        )}

        {/* PYQ Results */}
        {pyqState === "results" && (
          <motion.div
            key="pyq-results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPyqState("menu")}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h1 className="text-lg font-bold text-foreground">PYQ Practice Complete</h1>
            </div>

            <div className="glass-card rounded-xl p-5 space-y-4">
              <div className="text-center">
                <GraduationCap className="h-12 w-12 text-green-600 mx-auto mb-2" />
                <p className="text-3xl font-bold text-foreground">
                  {pyqAnswers.filter(a => a.correct).length}/{pyqQuestions.length}
                </p>
                <p className="text-sm text-muted-foreground">Official PYQs answered correctly</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Accuracy: {pyqQuestions.length > 0 ? Math.round((pyqAnswers.filter(a => a.correct).length / pyqQuestions.length) * 100) : 0}%
                </p>
              </div>

              <div className="flex gap-2">
                <Button onClick={startPyqPractice} className="flex-1 gap-2">
                  <ShieldCheck className="h-4 w-4" /> Try Again
                </Button>
                <Button variant="outline" onClick={() => setPyqState("menu")} className="flex-1">
                  Back to Menu
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ── PYQ Quiz Card — interactive PYQ with official key ──
function PYQQuizCard({
  pyq,
  questionNumber,
  totalQuestions,
  onAnswer,
  onNext,
}: {
  pyq: PYQQuestion;
  questionNumber: number;
  totalQuestions: number;
  onAnswer: (label: string, correct: boolean, xp: number) => void;
  onNext: () => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const revealed = selected !== null;
  const isPrelims = pyq.question_type === "mcq" && pyq.options && pyq.options.length > 0;
  const isCorrect = revealed && pyq.official_key ? selected === pyq.official_key.answer_label : false;

  const handleSelect = (label: string) => {
    if (revealed) return;
    setSelected(label);
    const correct = pyq.official_key ? label === pyq.official_key.answer_label : false;
    onAnswer(label, correct, correct ? 15 : 0);
  };

  return (
    <div className="glass-card rounded-xl p-5">
      {/* Badges */}
      <div className="flex items-center gap-1.5 mb-3 flex-wrap">
        <Badge className="bg-green-500/15 text-green-600 border-green-500/30 text-[10px] gap-1">
          <ShieldCheck className="h-3 w-3" /> Official PYQ
        </Badge>
        <Badge variant="outline" className="text-[10px]">{pyq.year}</Badge>
        <Badge variant="outline" className="text-[10px]">{pyq.paper_code.toUpperCase()}</Badge>
        {pyq.topic && <Badge variant="secondary" className="text-[10px]">{pyq.topic}</Badge>}
      </div>

      {/* Question */}
      <p className="text-sm font-medium text-foreground mb-4 leading-relaxed">
        Q{questionNumber}. {pyq.question_text}
      </p>

      {/* Prelims options */}
      {isPrelims && (
        <div className="space-y-2 mb-4">
          {pyq.options!.map((opt) => {
            let style = "border-border text-foreground cursor-pointer hover:bg-muted/50";
            if (revealed) {
              if (pyq.official_key && opt.option_label === pyq.official_key.answer_label) {
                style = "border-green-500/40 bg-green-500/10 text-foreground font-medium";
              } else if (opt.option_label === selected) {
                style = "border-destructive/40 bg-destructive/10 text-foreground";
              } else {
                style = "border-border text-muted-foreground opacity-50";
              }
            }
            return (
              <button
                key={opt.option_label}
                className={`w-full text-left text-sm px-4 py-2.5 rounded-lg border transition-colors ${style}`}
                onClick={() => handleSelect(opt.option_label)}
                disabled={revealed}
              >
                ({opt.option_label.toLowerCase()}) {opt.option_text}
              </button>
            );
          })}
        </div>
      )}

      {/* Mains — just show the question, no options */}
      {!isPrelims && pyq.exam_stage === "mains" && (
        <div className="mb-4">
          {pyq.marks && <p className="text-xs text-muted-foreground">{pyq.marks} marks{pyq.word_limit ? ` · ${pyq.word_limit} words` : ""}</p>}
          <p className="text-xs text-muted-foreground italic mt-2">UPSC does not publish Mains answer keys</p>
        </div>
      )}

      {/* Feedback + Next */}
      <AnimatePresence>
        {revealed && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            {pyq.official_key ? (
              <div className={cn(
                "rounded-lg p-3 text-sm",
                isCorrect ? "bg-green-500/10 border border-green-500/20" : "bg-destructive/10 border border-destructive/20"
              )}>
                <p className="font-semibold">
                  {isCorrect ? "Correct!" : "Incorrect"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Official answer: ({pyq.official_key.answer_label.toLowerCase()})
                  {pyq.official_key.is_official ? (
                    <span className="ml-1 text-green-600">[Official Final Key]</span>
                  ) : (
                    <span className="ml-1">[Coaching Consensus]</span>
                  )}
                </p>
              </div>
            ) : (
              <div className="rounded-lg p-3 bg-muted/50 border text-sm">
                <p className="text-muted-foreground">No official answer key available</p>
              </div>
            )}

            <Button onClick={onNext} className="w-full h-10 gap-2">
              {questionNumber < totalQuestions ? "Next Question" : "See Results"}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default PracticePage;
