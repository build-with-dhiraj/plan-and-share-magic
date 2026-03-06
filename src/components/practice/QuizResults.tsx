import { motion } from "framer-motion";
import { Trophy, RotateCcw, ChevronRight, Target, TrendingUp, Flame, Zap, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface QuizResultsProps {
  correct: number;
  total: number;
  totalXP?: number;
  topicBreakdown: Record<string, { correct: number; total: number }>;
  timedMode?: boolean;
  onRetry: () => void;
  onNewQuiz: () => void;
}

export function QuizResults({ correct, total, totalXP, topicBreakdown, timedMode, onRetry, onNewQuiz }: QuizResultsProps) {
  const percentage = Math.round((correct / total) * 100);
  const grade = percentage >= 80 ? "Excellent" : percentage >= 60 ? "Good" : percentage >= 40 ? "Keep Practising" : "Needs Work";
  const gradeColor = percentage >= 80 ? "text-[hsl(var(--gs-economy))]" : percentage >= 60 ? "text-accent" : percentage >= 40 ? "text-[hsl(var(--gs-ir))]" : "text-destructive";
  const gradeIcon = percentage >= 80 ? Trophy : percentage >= 60 ? TrendingUp : Target;
  const GradeIcon = gradeIcon;

  const displayXP = totalXP ?? correct * 10;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-5"
    >
      {/* Score card */}
      <div className="glass-card rounded-2xl p-6 text-center space-y-3">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", delay: 0.2 }}
        >
          <GradeIcon className={cn("h-12 w-12 mx-auto", gradeColor)} />
        </motion.div>
        <div>
          <motion.p
            className={cn("text-3xl font-bold", gradeColor)}
            initial={{ scale: 0.5 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.3 }}
          >
            {percentage}%
          </motion.p>
          <p className="text-sm text-muted-foreground">{grade}</p>
        </div>
        <div className="flex items-center justify-center gap-6 text-sm">
          <div className="text-center">
            <p className="text-lg font-bold text-foreground">{correct}</p>
            <p className="text-xs text-muted-foreground">Correct</p>
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="text-center">
            <p className="text-lg font-bold text-foreground">{total - correct}</p>
            <p className="text-xs text-muted-foreground">Wrong</p>
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="text-center">
            <p className="text-lg font-bold text-foreground">{total}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
        </div>

        {/* XP earned with animation */}
        <motion.div
          className="flex items-center justify-center gap-2 pt-1"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <Zap className="h-5 w-5 text-accent fill-accent" />
          <span className="text-base font-bold text-accent">
            {displayXP > 0 ? "+" : ""}{displayXP} XP earned
          </span>
          {timedMode && (
            <span className="flex items-center gap-0.5 text-xs text-muted-foreground ml-1">
              <Timer className="h-3 w-3" /> Timed
            </span>
          )}
        </motion.div>
      </div>

      {/* Topic breakdown */}
      {Object.keys(topicBreakdown).length > 0 && (
        <div className="glass-card rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Topic Breakdown</h3>
          <div className="space-y-2.5">
            {Object.entries(topicBreakdown).map(([topic, data]) => {
              const pct = Math.round((data.correct / data.total) * 100);
              return (
                <motion.div
                  key={topic}
                  className="space-y-1"
                  initial={{ x: -10, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  <div className="flex justify-between text-xs">
                    <span className="text-foreground font-medium">{topic}</span>
                    <span className="text-muted-foreground">{data.correct}/{data.total}</span>
                  </div>
                  <Progress value={pct} className="h-2" />
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" onClick={onRetry} className="h-11 gap-2 text-sm">
          <RotateCcw className="h-4 w-4" /> Retry
        </Button>
        <Button onClick={onNewQuiz} className="h-11 gap-2 text-sm">
          New Quiz <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );
}
