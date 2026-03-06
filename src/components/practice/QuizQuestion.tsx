import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, ChevronRight, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MCQ } from "@/data/sampleMCQs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { TimerRing } from "./TimerRing";
import { XPPopup } from "./XPPopup";
import { StreakFire } from "./StreakFire";

interface QuizQuestionProps {
  mcq: MCQ;
  questionNumber: number;
  totalQuestions: number;
  onAnswer: (selectedIndex: number, isCorrect: boolean, xpEarned: number, timeLeft: number) => void;
  onNext: () => void;
  timedMode?: boolean;
  timeLimit?: number;
  currentStreak?: number;
}

const optionLabels = ["(a)", "(b)", "(c)", "(d)"];

const topicToClass: Record<string, string> = {
  Polity: "gs-tag-polity",
  Economy: "gs-tag-economy",
  Environment: "gs-tag-environment",
  IR: "gs-tag-ir",
  Science: "gs-tag-science",
  Geography: "gs-tag-geography",
  History: "gs-tag-history",
  Ethics: "gs-tag-ethics",
  Society: "gs-tag-society",
};

export function QuizQuestion({
  mcq, questionNumber, totalQuestions, onAnswer, onNext,
  timedMode = false, timeLimit = 60, currentStreak = 0
}: QuizQuestionProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [showXP, setShowXP] = useState(false);
  const [earnedXP, setEarnedXP] = useState(0);
  const [wasCorrect, setWasCorrect] = useState(false);
  const [bonusTime, setBonusTime] = useState(0);
  const timerRunning = useRef(true);
  const startTime = useRef(Date.now());

  const handleSelect = (index: number) => {
    if (revealed) return;
    setSelected(index);
  };

  const calculateXP = useCallback((isCorrect: boolean, elapsed: number) => {
    if (!isCorrect) return timedMode ? -5 : 0;
    let xp = 10;
    // Speed bonus in timed mode
    if (timedMode) {
      const remaining = Math.max(0, timeLimit - elapsed);
      const speedBonus = Math.floor(remaining / 5);
      setBonusTime(speedBonus);
      xp += speedBonus;
    }
    // Streak bonus
    if (currentStreak >= 2) xp += 5;
    if (currentStreak >= 4) xp += 5;
    return xp;
  }, [timedMode, timeLimit, currentStreak]);

  const doReveal = useCallback((selectedIdx: number | null) => {
    if (revealed) return;
    timerRunning.current = false;
    setRevealed(true);
    const elapsed = (Date.now() - startTime.current) / 1000;
    const idx = selectedIdx ?? -1;
    const isCorrect = idx === mcq.correctIndex;
    const xp = calculateXP(isCorrect, elapsed);
    setEarnedXP(xp);
    setWasCorrect(isCorrect);
    setShowXP(true);
    setTimeout(() => setShowXP(false), 1800);
    onAnswer(idx, isCorrect, xp, timedMode ? Math.max(0, timeLimit - elapsed) : 0);
  }, [revealed, mcq.correctIndex, calculateXP, onAnswer, timedMode, timeLimit]);

  const handleSubmit = () => {
    if (selected === null) return;
    doReveal(selected);
  };

  const handleTimeUp = useCallback(() => {
    doReveal(selected);
  }, [doReveal, selected]);

  const isCorrect = selected === mcq.correctIndex;

  return (
    <>
      <XPPopup show={showXP} xp={earnedXP} isCorrect={wasCorrect} streak={currentStreak} bonusTime={bonusTime} />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -16 }}
        transition={{ duration: 0.3 }}
        className="space-y-4"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              Q {questionNumber}/{totalQuestions}
            </span>
            {currentStreak >= 2 && <StreakFire streak={currentStreak} />}
          </div>
          <div className="flex items-center gap-2">
            {timedMode && (
              <TimerRing
                duration={timeLimit}
                isRunning={!revealed}
                onTimeUp={handleTimeUp}
                size={40}
              />
            )}
            <Badge className={cn("border text-[10px]", topicToClass[mcq.topic] || "")}>
              {mcq.topic}
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              {mcq.difficulty}
            </Badge>
          </div>
        </div>

        {/* Question */}
        <div className="reading-prose !text-[15px] !leading-relaxed">
          <p className="font-medium text-foreground">{mcq.question}</p>
          {mcq.statements && mcq.statements.length > 0 && (
            <ol className="mt-2.5 space-y-1.5 list-decimal list-inside text-sm text-foreground/90">
              {mcq.statements.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
          )}
          {mcq.statements && mcq.statements.length > 0 && (
            <p className="mt-2.5 text-sm text-muted-foreground">
              Which of the statements given above is/are correct?
            </p>
          )}
        </div>

        {/* Options */}
        <div className="space-y-2.5">
          {mcq.options.map((option, i) => {
            const isThis = selected === i;
            const isAnswer = mcq.correctIndex === i;
            let borderClass = "border-border";
            let bgClass = "bg-card";

            if (revealed) {
              if (isAnswer) {
                borderClass = "border-[hsl(var(--gs-economy))]";
                bgClass = "bg-[hsl(var(--gs-economy))]/10";
              } else if (isThis && !isAnswer) {
                borderClass = "border-destructive";
                bgClass = "bg-destructive/10";
              }
            } else if (isThis) {
              borderClass = "border-accent";
              bgClass = "bg-accent/10";
            }

            return (
              <motion.button
                key={i}
                whileTap={!revealed ? { scale: 0.98 } : {}}
                onClick={() => handleSelect(i)}
                className={cn(
                  "w-full text-left rounded-xl border-2 p-3.5 sm:p-4 transition-all duration-200",
                  borderClass, bgClass,
                  !revealed && "cursor-pointer active:scale-[0.98]",
                  revealed && "cursor-default"
                )}
              >
                <div className="flex items-start gap-3">
                  <span className="text-xs font-semibold text-muted-foreground mt-0.5 shrink-0 w-5">
                    {optionLabels[i]}
                  </span>
                  <span className="text-sm text-foreground flex-1">{option}</span>
                  {revealed && isAnswer && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }}>
                      <CheckCircle2 className="h-5 w-5 text-[hsl(var(--gs-economy))] shrink-0 mt-0.5" />
                    </motion.div>
                  )}
                  {revealed && isThis && !isAnswer && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }}>
                      <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                    </motion.div>
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Actions */}
        <AnimatePresence mode="wait">
          {!revealed ? (
            <motion.div key="submit" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Button
                onClick={handleSubmit}
                disabled={selected === null}
                className="w-full h-12 text-sm font-semibold"
              >
                Check Answer
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="explanation"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              {/* Result banner */}
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                className={cn(
                  "rounded-xl p-4 flex items-start gap-3",
                  isCorrect ? "bg-[hsl(var(--gs-economy))]/10 border border-[hsl(var(--gs-economy))]/30" : "bg-destructive/10 border border-destructive/30"
                )}
              >
                {isCorrect ? (
                  <motion.div initial={{ rotate: -180, scale: 0 }} animate={{ rotate: 0, scale: 1 }} transition={{ type: "spring" }}>
                    <CheckCircle2 className="h-5 w-5 text-[hsl(var(--gs-economy))] shrink-0 mt-0.5" />
                  </motion.div>
                ) : (
                  <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                )}
                <div>
                  <p className={cn("text-sm font-semibold", isCorrect ? "text-[hsl(var(--gs-economy))]" : "text-destructive")}>
                    {isCorrect ? "Correct!" : selected === null ? "Time's Up!" : "Incorrect"}
                  </p>
                  {!isCorrect && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Correct answer: {optionLabels[mcq.correctIndex]} {mcq.options[mcq.correctIndex]}
                    </p>
                  )}
                  {timedMode && earnedXP < 0 && (
                    <p className="text-xs text-destructive mt-0.5">-5 XP penalty</p>
                  )}
                </div>
              </motion.div>

              {/* Explanation */}
              <div className="glass-card rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="h-4 w-4 text-accent" />
                  <span className="text-xs font-semibold text-accent">Explanation</span>
                  {mcq.source && (
                    <Badge variant="outline" className="text-[10px] ml-auto">{mcq.source}</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{mcq.explanation}</p>
              </div>

              <Button onClick={onNext} className="w-full h-12 text-sm font-semibold gap-2">
                Next Question <ChevronRight className="h-4 w-4" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  );
}
