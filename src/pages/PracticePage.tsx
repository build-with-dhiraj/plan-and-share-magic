import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, Shuffle, BookOpen, Flame, ArrowLeft, Timer, Zap, Trophy, Calendar, GraduationCap, ShieldCheck, CheckCircle2, RotateCcw, XCircle, Brain, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { QuizQuestion } from "@/components/practice/QuizQuestion";
import { QuizResults } from "@/components/practice/QuizResults";
import { cn } from "@/lib/utils";
import { fetchPYQYears, fetchPYQTopicCounts, type PYQQuestion } from "@/hooks/usePYQBank";
import { fetchTopicCounts } from "@/hooks/useMCQBank";
import { useAuth } from "@/hooks/useAuth";
import { useSpacedRepetition } from "@/hooks/useSpacedRepetition";
import { useTopicQuiz } from "@/hooks/useTopicQuiz";
import { usePYQQuiz } from "@/hooks/usePYQQuiz";

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

const PracticePage = () => {
  const { user } = useAuth();
  
  // Custom Hooks
  const { dueCards, stats: revisionStats, reviewCard, refresh: refreshRevision } = useSpacedRepetition();
  const {
    quizState, setQuizState, selectedTopic, questions, currentIndex, answers,
    timedMode, setTimedMode, totalXP, startQuiz, handleAnswer, handleNext,
    topicBreakdown, correctCount, streak
  } = useTopicQuiz();
  const {
    pyqState, setPyqState, pyqStage, setPyqStage, pyqYear, setPyqYear,
    pyqGsPaper, setPyqGsPaper, pyqQuestions, pyqIndex, pyqAnswers,
    pyqLoading, pyqTotalXP, startPyqPractice, handlePyqAnswer, handlePyqNext
  } = usePYQQuiz(user);

  // Component State
  const [topicCounts, setTopicCounts] = useState<Record<string, number>>({});
  const [pyqYears, setPyqYears] = useState<number[]>([]);
  const [pyqTopicCounts, setPyqTopicCounts] = useState<Record<string, number>>({});
  
  // Revise flow state (localized to section)
  const [reviseState, setReviseState] = useState<"queue" | "review" | "done">("queue");
  const [reviseIdx, setReviseIdx] = useState(0);
  const [reviseSelectedOption, setReviseSelectedOption] = useState<number | null>(null);
  const [reviseRevealed, setReviseRevealed] = useState(false);
  const [reviseReviewedCount, setReviseReviewedCount] = useState(0);

  useEffect(() => {
    fetchTopicCounts().then(setTopicCounts);
    fetchPYQYears().then(setPyqYears);
    fetchPYQTopicCounts().then(setPyqTopicCounts);
  }, []);

  const topics = useMemo(() =>
    topicDefs.map((t) => ({ ...t, count: topicCounts[t.name] || 0 })),
    [topicCounts]
  );

  const currentReviseCard = dueCards[reviseIdx];

  const startReviseSession = () => {
    setReviseIdx(0);
    setReviseSelectedOption(null);
    setReviseRevealed(false);
    setReviseReviewedCount(0);
    setReviseState("review");
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

  return (
    <div className="container max-w-2xl py-6 px-4 pb-24 lg:pb-12">
      <AnimatePresence mode="wait">
        {(quizState === "menu" && pyqState === "menu") && (
          <motion.div key="main-menu" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-8">
            <header>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">Practice Zone</h1>
              <p className="text-sm text-muted-foreground mt-1">Strengthen recall or simulate exams</p>
            </header>

            {/* HERO CTA: Daily Quiz */}
            <section>
              <Link to="/daily" className="group block relative overflow-hidden rounded-2xl glass-card p-6 border-l-4 border-l-accent shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Trophy className="h-5 w-5 text-accent" />
                      <span className="text-xs font-bold uppercase tracking-widest text-accent">Daily Challenge</span>
                    </div>
                    <h2 className="text-xl font-bold">Today's UPSC Prep</h2>
                    <p className="text-sm text-muted-foreground">5 fresh MCQs from today's brief</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-accent/10 flex items-center justify-center text-accent group-hover:bg-accent group-hover:text-accent-foreground transition-colors">
                    <ChevronRight className="h-6 w-6" />
                  </div>
                </div>
              </Link>
            </section>

            {/* SPACED REPETITION / REVISE */}
            {revisionStats.dueToday > 0 && (
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <RotateCcw className="h-4 w-4" /> Spaced Repetition
                  </h3>
                  <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                    {revisionStats.dueToday} due today
                  </Badge>
                </div>
                
                {reviseState === "queue" && (
                  <Card className="glass-card border-l-4 border-l-primary p-5 flex items-center justify-between transition-all hover:shadow-md">
                    <div className="space-y-1">
                      <p className="text-base font-bold">Review Your Errors</p>
                      <p className="text-xs text-muted-foreground">Master {revisionStats.dueToday} difficult topics</p>
                    </div>
                    <Button onClick={startReviseSession} size="sm" className="gap-2 font-bold">
                      <Flame className="h-4 w-4" /> Review Now
                    </Button>
                  </Card>
                )}

                {reviseState === "review" && currentReviseCard && (
                  <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-muted-foreground">Card {reviseIdx + 1} of {dueCards.length}</p>
                      <Button variant="ghost" size="sm" onClick={() => setReviseState("queue")} className="h-6 text-[10px] uppercase">Quit</Button>
                    </div>
                    <Card className="glass-card overflow-hidden">
                      <CardContent className="p-5">
                        <Badge className="mb-3 text-[10px] border-border">{currentReviseCard.mcq.topic}</Badge>
                        <p className="text-base font-medium leading-relaxed mb-4">{currentReviseCard.mcq.question}</p>
                        <div className="space-y-2">
                          {currentReviseCard.mcq.options.map((opt: string, i: number) => {
                            const isCorrect = i === currentReviseCard.mcq.correctIndex;
                            const isSelected = reviseSelectedOption === i;
                            return (
                              <button
                                key={i}
                                onClick={() => !reviseRevealed && (setReviseSelectedOption(i), setReviseRevealed(true))}
                                className={cn(
                                  "w-full text-left p-3 rounded-xl text-sm border transition-all",
                                  !reviseRevealed && "hover:bg-accent/5 border-border",
                                  reviseRevealed && isCorrect && "border-success bg-success/10",
                                  reviseRevealed && isSelected && !isCorrect && "border-destructive bg-destructive/10",
                                  reviseRevealed && !isSelected && !isCorrect && "opacity-40"
                                )}
                              >
                                <span className="flex items-center gap-2">
                                  <span className="text-muted-foreground text-xs font-mono w-5">{String.fromCharCode(65 + i)}.</span>
                                  <span className={cn(reviseRevealed && isCorrect && "font-semibold")}>{opt}</span>
                                  {reviseRevealed && isCorrect && <CheckCircle2 className="h-4 w-4 text-success ml-auto" />}
                                  {reviseRevealed && isSelected && !isCorrect && <XCircle className="h-4 w-4 text-destructive ml-auto" />}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                        {reviseRevealed && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="mt-4 pt-4 border-t">
                            <h4 className="text-[10px] font-bold uppercase text-muted-foreground mb-1.5">How clear was this?</h4>
                            <div className="grid grid-cols-3 gap-2">
                              <Button variant="outline" onClick={() => handleReviseSubmit(1)} className="h-9 text-xs border-destructive/20 text-destructive">Forgot</Button>
                              <Button variant="outline" onClick={() => handleReviseSubmit(3)} className="h-9 text-xs border-accent/20 text-accent">Hard</Button>
                              <Button variant="outline" onClick={() => handleReviseSubmit(5)} className="h-9 text-xs border-success/20 text-success font-bold">Easy</Button>
                            </div>
                          </motion.div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                )}

                {/* Revise Done state */}
                {reviseState === "done" && (
                  <Card className="glass-card p-6 text-center space-y-3">
                    <Trophy className="h-10 w-10 text-accent mx-auto" />
                    <h4 className="text-lg font-bold">Review Complete</h4>
                    <p className="text-sm text-muted-foreground">You've mastered {reviseReviewedCount} cards today</p>
                    <Button onClick={() => setReviseState("queue")} size="sm">Great!</Button>
                  </Card>
                )}
              </section>
            )}

            {/* TOPIC DRILLS */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Target className="h-4 w-4" /> Topic Drills
                </h3>
                <div className="flex items-center gap-2 px-2 py-1 bg-muted/50 rounded-lg">
                  <Timer className={cn("h-3.5 w-3.5", timedMode ? "text-accent" : "text-muted-foreground")} />
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">Timed</span>
                  <button onClick={() => setTimedMode(!timedMode)} className={cn("relative h-4 w-7 rounded-full transition-colors", timedMode ? "bg-accent" : "bg-border")}>
                    <motion.div className="absolute top-0.5 h-3 w-3 rounded-full bg-white shadow-sm" animate={{ left: timedMode ? 14 : 2 }} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <motion.button whileTap={{ scale: 0.97 }} onClick={() => startQuiz(null)} className="glass-card p-4 rounded-xl text-left border-l-2 border-l-primary flex flex-col justify-between min-h-[100px] hover:shadow-md transition-shadow">
                  <div className="p-1.5 rounded-lg bg-primary/10 w-fit mb-2"><Shuffle className="h-4 w-4 text-primary" /></div>
                  <div>
                    <p className="text-sm font-bold">Random Mix</p>
                    <p className="text-[11px] text-muted-foreground">All GS Topics</p>
                  </div>
                </motion.button>
                {topics.map((t) => (
                  <motion.button
                    key={t.name}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => t.count > 0 && startQuiz(t.name)}
                    disabled={t.count === 0}
                    className={cn(
                      "glass-card p-4 rounded-xl text-left transition-all hover:shadow-md min-h-[100px] flex flex-col justify-between",
                      t.count === 0 ? "opacity-50 grayscale" : "border-l-2 border-l-border hover:border-l-accent"
                    )}
                  >
                    <Badge className={cn("border text-[10px] w-fit", t.cls)}>{t.name}</Badge>
                    <div className="mt-2">
                      <p className="text-[11px] font-bold text-muted-foreground uppercase">{t.count} Questions</p>
                    </div>
                  </motion.button>
                ))}
              </div>
            </section>

            {/* PAST YEAR QUESTIONS */}
            <section className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <GraduationCap className="h-4 w-4" /> Past Year Questions
              </h3>
              <Card className="glass-card p-6 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Filters Grid */}
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block">Exam Stage</label>
                      <div className="flex gap-2">
                        {[{ label: "All", v: null }, { label: "Prelims", v: "prelims" }, { label: "Mains", v: "mains" }].map(o => (
                          <button key={o.label} onClick={() => setPyqStage(o.v as any)} className={cn("flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all", pyqStage === o.v ? "bg-primary text-white border-primary" : "bg-muted/30 border-border")}>{o.label}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block">GS Paper</label>
                      <div className="flex flex-wrap gap-1.5">
                        {[null, "GS-1", "GS-2", "GS-3", "GS-4"].map(p => (
                          <button key={p || 'all'} onClick={() => setPyqGsPaper(p)} className={cn("px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all", pyqGsPaper === p ? "bg-primary text-white border-primary" : "bg-muted/30 border-border")}>{p || 'All'}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block">Select Year</label>
                      <div className="grid grid-cols-3 gap-1.5">
                        <button onClick={() => setPyqYear(null)} className={cn("py-1 rounded-lg text-xs font-semibold border transition-all", pyqYear === null ? "bg-primary text-white border-primary" : "bg-muted/30 border-border")}>All</button>
                        {pyqYears.slice(0, 5).map(y => (
                          <button key={y} onClick={() => setPyqYear(y)} className={cn("py-1 rounded-lg text-xs font-semibold border transition-all", pyqYear === y ? "bg-primary text-white border-primary" : "bg-muted/30 border-border")}>{y}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <Button onClick={startPyqPractice} disabled={pyqLoading} className="w-full h-12 gap-2 text-base font-bold shadow-lg shadow-primary/10">
                  <ShieldCheck className="h-5 w-5" /> {pyqLoading ? "Loading..." : "Start PYQ Practice"}
                </Button>
              </Card>
            </section>
          </motion.div>
        )}

        {/* ACTIVE QUIZ FLOWS */}
        {quizState === "active" && questions[currentIndex] && (
          <motion.div key="active-quiz" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => setQuizState("menu")} className="h-10 w-10"><ArrowLeft className="h-5 w-5" /></Button>
              <div className="flex-1 space-y-1.5">
                <div className="flex justify-between items-end">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{selectedTopic || "Mixed"} Practice</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-accent px-2 py-0.5 bg-accent/10 rounded-full flex items-center gap-1"><Zap className="h-3 w-3" />{totalXP}</span>
                    <span className="text-xs font-medium text-muted-foreground">{currentIndex + 1}/{questions.length}</span>
                  </div>
                </div>
                <Progress value={((currentIndex + 1) / questions.length) * 100} className="h-1.5" />
              </div>
            </div>
            <QuizQuestion
              key={questions[currentIndex].id} mcq={questions[currentIndex]}
              questionNumber={currentIndex + 1} totalQuestions={questions.length}
              onAnswer={handleAnswer} onNext={handleNext}
              timedMode={timedMode} timeLimit={60} currentStreak={streak}
            />
          </motion.div>
        )}

        {quizState === "results" && (
          <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
             <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => setQuizState("menu")}><ArrowLeft className="h-5 w-5" /></Button>
              <h1 className="text-xl font-bold">Results</h1>
            </div>
            <QuizResults
              correct={correctCount} total={questions.length} totalXP={totalXP}
              topicBreakdown={topicBreakdown} timedMode={timedMode}
              onRetry={() => startQuiz(selectedTopic)} onNewQuiz={() => setQuizState("menu")}
            />
          </motion.div>
        )}

        {/* PYQ FLOWS */}
        {pyqState === "active" && pyqQuestions[pyqIndex] && (
          <motion.div key="pyq-active" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => setPyqState("menu")}><ArrowLeft className="h-5 w-5" /></Button>
              <div className="flex-1 space-y-1.5">
                <div className="flex justify-between items-end">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-green-600">Official PYQ {pyqQuestions[pyqIndex].year}</span>
                  <span className="text-xs font-medium text-muted-foreground">{pyqIndex+1}/{pyqQuestions.length}</span>
                </div>
                <Progress value={((pyqIndex + 1) / pyqQuestions.length) * 100} className="h-1.5" />
              </div>
            </div>
            <PYQQuizCard
              pyq={pyqQuestions[pyqIndex]} questionNumber={pyqIndex + 1}
              totalQuestions={pyqQuestions.length} onAnswer={handlePyqAnswer}
              onNext={handlePyqNext}
            />
          </motion.div>
        )}

        {pyqState === "results" && (
           <motion.div key="pyq-results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="flex items-center gap-3">
               <Button variant="ghost" size="icon" onClick={() => setPyqState("menu")}><ArrowLeft className="h-5 w-5" /></Button>
               <h1 className="text-xl font-bold">PYQ Performance</h1>
             </div>
             <Card className="glass-card p-8 text-center space-y-4">
                <GraduationCap className="h-16 w-16 text-green-600 mx-auto" strokeWidth={1.5} />
                <div className="space-y-1">
                  <p className="text-4xl font-extrabold">{pyqAnswers.filter(a => a.correct).length}/{pyqQuestions.length}</p>
                  <p className="text-sm text-muted-foreground font-medium">Official questions correct</p>
                </div>
                <div className="h-px bg-border w-24 mx-auto" />
                <div className="flex justify-center gap-8">
                  <div className="text-center">
                    <p className="text-lg font-bold text-accent flex items-center gap-1 justify-center"><Zap className="h-4 w-4" />{pyqTotalXP}</p>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">XP Gained</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold">{Math.round((pyqAnswers.filter(a => a.correct).length / pyqQuestions.length) * 100)}%</p>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Accuracy</p>
                  </div>
                </div>
                <div className="pt-4 flex gap-3">
                  <Button onClick={startPyqPractice} className="flex-1 font-bold">Try Again</Button>
                  <Button variant="outline" onClick={() => setPyqState("menu")} className="flex-1 font-bold">Exit</Button>
                </div>
             </Card>
           </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

function PYQQuizCard({ pyq, questionNumber, totalQuestions, onAnswer, onNext }: {
  pyq: PYQQuestion; questionNumber: number; totalQuestions: number;
  onAnswer: (label: string, correct: boolean, xp: number) => void; onNext: () => void;
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
    <Card className="glass-card overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Badge className="bg-green-500/15 text-green-600 border-green-500/30 text-[10px]">{pyq.year} UPSC</Badge>
          <Badge variant="outline" className="text-[10px]">{pyq.paper_code.toUpperCase()}</Badge>
        </div>
        <p className="text-base font-medium mb-6 leading-relaxed">Q{questionNumber}. {pyq.question_text}</p>
        
        {isPrelims && (
          <div className="space-y-2.5 mb-6">
            {pyq.options!.map((opt) => {
              let style = "border-border hover:bg-muted/50 transition-colors";
              if (revealed) {
                if (pyq.official_key && opt.option_label === pyq.official_key.answer_label) style = "border-success bg-success/10 font-bold";
                else if (opt.option_label === selected) style = "border-destructive bg-destructive/10";
                else style = "opacity-40 border-border";
              }
              return (
                <button
                  key={opt.option_label} disabled={revealed}
                  className={cn("w-full text-left text-sm px-4 py-3 rounded-xl border", style)}
                  onClick={() => handleSelect(opt.option_label)}
                >
                  <span className="flex items-center gap-3">
                    <span className="text-xs font-mono text-muted-foreground w-4">{opt.option_label}.</span>
                    <span>{opt.option_text}</span>
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <AnimatePresence>
          {revealed && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-4 pt-4 border-t">
              <div className={cn("p-3 rounded-lg flex items-center gap-3", isCorrect ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive")}>
                {isCorrect ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                <p className="text-sm font-bold">{isCorrect ? "Official Key Match" : "Incorrect"}</p>
              </div>
              <Button onClick={() => { setSelected(null); onNext(); }} className="w-full h-11 font-bold">Next Question</Button>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}

export default PracticePage;
