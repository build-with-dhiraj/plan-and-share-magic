import { useState, useCallback } from "react";
import { fetchPYQsForPractice, savePYQAttempt, type PYQQuestion } from "@/hooks/usePYQBank";
import type { QuizState } from "./useTopicQuiz";

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function usePYQQuiz(user: any) {
  const [pyqState, setPyqState] = useState<QuizState>("menu");
  const [pyqStage, setPyqStage] = useState<"prelims" | "mains" | null>(null);
  const [pyqYear, setPyqYear] = useState<number | null>(null);
  const [pyqGsPaper, setPyqGsPaper] = useState<string | null>(null);
  const [pyqQuestions, setPyqQuestions] = useState<PYQQuestion[]>([]);
  const [pyqIndex, setPyqIndex] = useState(0);
  const [pyqAnswers, setPyqAnswers] = useState<{ label: string; correct: boolean; xp: number }[]>([]);
  const [pyqLoading, setPyqLoading] = useState(false);
  const [pyqTotalXP, setPyqTotalXP] = useState(0);

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
        return false;
      }
      const shuffled = shuffleArray(pyqs).slice(0, Math.min(10, pyqs.length));
      setPyqQuestions(shuffled);
      setPyqIndex(0);
      setPyqAnswers([]);
      setPyqTotalXP(0);
      setPyqState("active");
      return true;
    } finally {
      setPyqLoading(false);
    }
  }, [pyqStage, pyqYear, pyqGsPaper]);

  const handlePyqAnswer = useCallback((label: string, correct: boolean, xp: number) => {
    setPyqAnswers((prev) => [...prev, { label, correct, xp }]);
    setPyqTotalXP((prev) => prev + xp);
  }, []);

  const handlePyqNext = useCallback(() => {
    if (pyqIndex + 1 >= pyqQuestions.length) {
      if (user) {
        const correctCount = pyqAnswers.filter((a) => a.correct).length;
        savePYQAttempt({
          userId: user.id,
          practiceType: pyqStage || "mixed",
          yearFilter: pyqYear ?? undefined,
          paperFilter: pyqGsPaper ?? undefined,
          totalQuestions: pyqQuestions.length,
          correctAnswers: correctCount,
          totalXP: pyqTotalXP,
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
  }, [pyqIndex, pyqQuestions, pyqAnswers, user, pyqStage, pyqYear, pyqGsPaper, pyqTotalXP]);

  return {
    pyqState,
    setPyqState,
    pyqStage,
    setPyqStage,
    pyqYear,
    setPyqYear,
    pyqGsPaper,
    setPyqGsPaper,
    pyqQuestions,
    pyqIndex,
    pyqAnswers,
    pyqLoading,
    pyqTotalXP,
    startPyqPractice,
    handlePyqAnswer,
    handlePyqNext,
  };
}
