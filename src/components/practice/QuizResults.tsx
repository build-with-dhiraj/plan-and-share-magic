import { motion } from "framer-motion";
import { Trophy, RotateCcw, ChevronRight, Target, TrendingUp, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface QuizResultsProps {
  correct: number;
  total: number;
  topicBreakdown: Record<string, { correct: number; total: number }>;
  onRetry: () => void;
  onNewQuiz: () => void;
}

export function QuizResults({ correct, total, topicBreakdown, onRetry, onNewQuiz }: QuizResultsProps) {
  const percentage = Math.round((correct / total) * 100);
  const grade = percentage >= 80 ? "Excellent" : percentage >= 60 ? "Good" : percentage >= 40 ? "Keep Practising" : "Needs Work";
  const gradeColor = percentage >= 80 ? "text-gs-economy" : percentage >= 60 ? "text-accent" : percentage >= 40 ? "text-gs-ir" : "text-destructive";
  const gradeIcon = percentage >= 80 ? Trophy : percentage >= 60 ? TrendingUp : Target;
  const GradeIcon = gradeIcon;

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
          <p className={cn("text-2xl font-bold", gradeColor)}>{percentage}%</p>
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

        {/* XP earned */}
        <div className="flex items-center justify-center gap-1.5 pt-1">
          <Flame className="h-4 w-4 text-accent" />
          <span className="text-sm font-semibold text-accent">+{correct * 10} XP earned</span>
        </div>
      </div>

      {/* Topic breakdown */}
      {Object.keys(topicBreakdown).length > 0 && (
        <div className="glass-card rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Topic Breakdown</h3>
          <div className="space-y-2.5">
            {Object.entries(topicBreakdown).map(([topic, data]) => {
              const pct = Math.round((data.correct / data.total) * 100);
              return (
                <div key={topic} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-foreground font-medium">{topic}</span>
                    <span className="text-muted-foreground">{data.correct}/{data.total}</span>
                  </div>
                  <Progress value={pct} className="h-2" />
                </div>
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
