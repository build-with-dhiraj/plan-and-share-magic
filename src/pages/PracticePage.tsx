import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Target, Shuffle, BookOpen, Flame, ArrowLeft, Timer, Zap, Trophy, Calendar } from "lucide-react";
import { Link } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnimatePresence, motion } from "framer-motion";
import { sampleMCQs, type MCQ } from "@/data/sampleMCQs";
import { QuizQuestion } from "@/components/practice/QuizQuestion";
import { QuizResults } from "@/components/practice/QuizResults";
import { cn } from "@/lib/utils";
import { useQuizPersist } from "@/hooks/useQuizPersist";
import { fetchMCQs, fetchTopicCounts } from "@/hooks/useMCQBank";

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
  const [quizState, setQuizState] = useState<QuizState>("menu");
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [questions, setQuestions] = useState<MCQ[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<{ selected: number; correct: boolean; xp: number }[]>([]);
  const [timedMode, setTimedMode] = useState(false);
  const [streak, setStreak] = useState(0);
  const [totalXP, setTotalXP] = useState(0);
  const [topicCounts, setTopicCounts] = useState<Record<string, number>>({});

  // Load topic counts from DB + fallback
  useEffect(() => {
    fetchTopicCounts().then(setTopicCounts);
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

            <Tabs defaultValue="daily" className="w-full">
              <TabsList className="w-full grid grid-cols-2 mb-4">
                <TabsTrigger value="daily" className="text-xs sm:text-sm gap-1.5">
                  <Trophy className="h-3.5 w-3.5" /> Today's CA Quiz
                </TabsTrigger>
                <TabsTrigger value="topic" className="text-xs sm:text-sm gap-1.5">
                  <Target className="h-3.5 w-3.5" /> Topic Practice
                </TabsTrigger>
              </TabsList>

              <TabsContent value="daily">
                <Link to="/daily" className="block">
                  <div className="glass-card rounded-xl p-5 text-center space-y-3 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-transparent to-primary/5 pointer-events-none" />
                    <Trophy className="h-12 w-12 text-accent mx-auto relative" />
                    <div className="relative">
                      <h2 className="text-lg font-bold text-foreground">Today's CA Quiz</h2>
                      <p className="text-sm text-muted-foreground mt-1">
                        5 questions from today's current affairs
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
      </AnimatePresence>
    </div>
  );
};

export default PracticePage;
