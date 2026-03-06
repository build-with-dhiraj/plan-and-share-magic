import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, ChevronRight, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MCQ } from "@/data/sampleMCQs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface QuizQuestionProps {
  mcq: MCQ;
  questionNumber: number;
  totalQuestions: number;
  onAnswer: (selectedIndex: number, isCorrect: boolean) => void;
  onNext: () => void;
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
};

export function QuizQuestion({ mcq, questionNumber, totalQuestions, onAnswer, onNext }: QuizQuestionProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);

  const handleSelect = (index: number) => {
    if (revealed) return;
    setSelected(index);
  };

  const handleSubmit = () => {
    if (selected === null) return;
    setRevealed(true);
    onAnswer(selected, selected === mcq.correctIndex);
  };

  const isCorrect = selected === mcq.correctIndex;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          Q {questionNumber}/{totalQuestions}
        </span>
        <div className="flex items-center gap-2">
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
              borderClass = "border-gs-economy";
              bgClass = "bg-gs-economy/10";
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
                borderClass,
                bgClass,
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
                  <CheckCircle2 className="h-5 w-5 text-gs-economy shrink-0 mt-0.5" />
                )}
                {revealed && isThis && !isAnswer && (
                  <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
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
            <div className={cn(
              "rounded-xl p-4 flex items-start gap-3",
              isCorrect ? "bg-gs-economy/10 border border-gs-economy/30" : "bg-destructive/10 border border-destructive/30"
            )}>
              {isCorrect ? (
                <CheckCircle2 className="h-5 w-5 text-gs-economy shrink-0 mt-0.5" />
              ) : (
                <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              )}
              <div>
                <p className={cn("text-sm font-semibold", isCorrect ? "text-gs-economy" : "text-destructive")}>
                  {isCorrect ? "Correct!" : "Incorrect"}
                </p>
                {!isCorrect && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Correct answer: {optionLabels[mcq.correctIndex]} {mcq.options[mcq.correctIndex]}
                  </p>
                )}
              </div>
            </div>

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
  );
}
