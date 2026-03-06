import { useState, useCallback } from "react";
import { RotateCcw, Flame, ArrowLeft, CheckCircle2, XCircle, Brain, Zap, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { XPStreakWidget } from "@/components/gamification/XPStreakWidget";
import { useSpacedRepetition } from "@/hooks/useSpacedRepetition";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

type PageState = "queue" | "review" | "done";

const RevisionPage = () => {
  const { dueCards, stats, reviewCard, refresh } = useSpacedRepetition();
  const [pageState, setPageState] = useState<PageState>("queue");
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);

  const currentCard = dueCards[currentIdx];

  const startReview = useCallback(() => {
    setCurrentIdx(0);
    setSelectedOption(null);
    setRevealed(false);
    setReviewedCount(0);
    setPageState("review");
  }, []);

  const handleOptionSelect = (index: number) => {
    if (revealed) return;
    setSelectedOption(index);
    setRevealed(true);
  };

  const handleReviewSubmit = async (quality: number) => {
    if (!currentCard) return;
    await reviewCard(currentCard.id, quality);
    setReviewedCount((p) => p + 1);

    if (currentIdx + 1 >= dueCards.length) {
      setPageState("done");
    } else {
      setCurrentIdx((i) => i + 1);
      setSelectedOption(null);
      setRevealed(false);
    }
  };

  return (
    <div className="container max-w-2xl py-4 sm:py-6 px-4 pb-24 lg:pb-6">
      <AnimatePresence mode="wait">
        {pageState === "queue" && (
          <motion.div
            key="queue"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-foreground tracking-tight">Revision</h1>
                <p className="text-sm text-muted-foreground mt-1">Spaced repetition queue (SM-2)</p>
              </div>
              <XPStreakWidget />
            </div>

            <Card className="glass-card mb-6">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <RotateCcw className="h-4 w-4 text-accent" />
                  Today's Queue
                </CardTitle>
              </CardHeader>
              <CardContent>
                {stats.loading ? (
                  <p className="text-sm text-muted-foreground">Loading…</p>
                ) : stats.dueToday === 0 ? (
                  <div className="text-center py-4">
                    <CheckCircle2 className="h-8 w-8 text-accent mx-auto mb-2" />
                    <p className="text-sm font-medium text-foreground">All caught up!</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      No cards due for review. Practice more quizzes to build your review queue.
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground mb-4">
                      {stats.dueToday} card{stats.dueToday !== 1 ? "s" : ""} due for review
                    </p>
                    <Button onClick={startReview} className="w-full bg-primary text-primary-foreground">
                      <Flame className="h-4 w-4 mr-2" /> Start Review Session
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Due Today", value: stats.loading ? "…" : String(stats.dueToday), color: "text-accent", icon: Brain },
                { label: "Reviewed", value: stats.loading ? "…" : String(stats.reviewedToday), color: "text-[hsl(var(--gs-economy))]", icon: RotateCcw },
                { label: "Mastered", value: stats.loading ? "…" : String(stats.mastered), color: "text-[hsl(var(--gs-polity))]", icon: Trophy },
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

        {pageState === "review" && currentCard && (
          <motion.div
            key={`review-${currentIdx}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPageState("queue")}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">
                  Card {currentIdx + 1} of {dueCards.length}
                </p>
              </div>
              <Badge variant="outline" className="text-[10px]">
                Interval: {currentCard.interval_days}d
              </Badge>
            </div>

            <Card className="glass-card mb-4">
              <CardContent className="p-5">
                <Badge className="mb-3 text-[10px]">{currentCard.mcq.topic}</Badge>
                <p className="text-base font-medium text-foreground leading-relaxed mb-1">
                  {currentCard.mcq.question}
                </p>
                {currentCard.mcq.statements && (
                  <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1 mt-2 mb-3">
                    {currentCard.mcq.statements.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ol>
                )}

                <div className="space-y-2 mt-4">
                  {currentCard.mcq.options.map((opt, i) => {
                    const isCorrect = i === currentCard.mcq.correctIndex;
                    const isSelected = selectedOption === i;
                    return (
                      <button
                        key={i}
                        onClick={() => handleOptionSelect(i)}
                        disabled={revealed}
                        className={cn(
                          "w-full text-left p-3 rounded-xl text-sm border transition-all",
                          !revealed && "hover:bg-accent/5 border-border",
                          revealed && isCorrect && "border-[hsl(var(--gs-economy))] bg-[hsl(var(--gs-economy))]/10",
                          revealed && isSelected && !isCorrect && "border-destructive bg-destructive/10",
                          revealed && !isSelected && !isCorrect && "opacity-50 border-border"
                        )}
                      >
                        <span className="flex items-center gap-2">
                          <span className="text-muted-foreground text-xs font-mono w-5">
                            {String.fromCharCode(65 + i)}.
                          </span>
                          <span className={cn(revealed && isCorrect && "font-semibold text-foreground")}>
                            {opt}
                          </span>
                          {revealed && isCorrect && <CheckCircle2 className="h-4 w-4 text-[hsl(var(--gs-economy))] ml-auto shrink-0" />}
                          {revealed && isSelected && !isCorrect && <XCircle className="h-4 w-4 text-destructive ml-auto shrink-0" />}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {revealed && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 p-3 bg-muted/50 rounded-xl"
                  >
                    <p className="text-xs font-semibold text-foreground mb-1">Explanation</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {currentCard.mcq.explanation}
                    </p>
                  </motion.div>
                )}
              </CardContent>
            </Card>

            {revealed && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-2"
              >
                <p className="text-xs text-muted-foreground text-center mb-2">How well did you recall this?</p>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant="outline"
                    onClick={() => handleReviewSubmit(1)}
                    className="border-destructive/30 text-destructive hover:bg-destructive/10"
                  >
                    <XCircle className="h-4 w-4 mr-1" /> Forgot
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleReviewSubmit(3)}
                    className="border-accent/30 text-accent hover:bg-accent/10"
                  >
                    <Brain className="h-4 w-4 mr-1" /> Hard
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleReviewSubmit(5)}
                    className="border-[hsl(var(--gs-economy))]/30 text-[hsl(var(--gs-economy))] hover:bg-[hsl(var(--gs-economy))]/10"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" /> Easy
                  </Button>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

        {pageState === "done" && (
          <motion.div
            key="done"
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
              You reviewed {reviewedCount} card{reviewedCount !== 1 ? "s" : ""}
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => { refresh(); setPageState("queue"); }}>
                Back to Queue
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RevisionPage;
