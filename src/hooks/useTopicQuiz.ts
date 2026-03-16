import { useState, useCallback, useMemo } from "react";
import { fetchMCQs, type MCQ } from "@/hooks/useMCQBank";
import { useQuizPersist } from "@/hooks/useQuizPersist";

export type QuizState = "menu" | "active" | "results";

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function useTopicQuiz() {
  const { saveQuizResult } = useQuizPersist();
  const [quizState, setQuizState] = useState<QuizState>("menu");
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [questions, setQuestions] = useState<MCQ[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<{ selected: number; correct: boolean; xp: number }[]>([]);
  const [timedMode, setTimedMode] = useState(false);
  const [streak, setStreak] = useState(0);
  const [totalXP, setTotalXP] = useState(0);

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

  const handleAnswer = useCallback((selectedIndex: number, isCorrect: boolean, xpEarned: number) => {
    setAnswers((prev) => [...prev, { selected: selectedIndex, correct: isCorrect, xp: xpEarned }]);
    setTotalXP((prev) => prev + xpEarned);
    setStreak((prev) => (isCorrect ? prev + 1 : 0));
  }, []);

  const handleNext = useCallback(() => {
    if (currentIndex + 1 >= questions.length) {
      saveQuizResult({
        quizType: selectedTopic ? "topic_drill" : "practice",
        topic: selectedTopic,
        totalQuestions: questions.length,
        correctAnswers: answers.filter((a) => a.correct).length,
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
  }, [currentIndex, questions, answers, saveQuizResult, selectedTopic, totalXP, streak, timedMode]);

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

  return {
    quizState,
    setQuizState,
    selectedTopic,
    questions,
    currentIndex,
    answers,
    timedMode,
    setTimedMode,
    streak,
    totalXP,
    startQuiz,
    handleAnswer,
    handleNext,
    topicBreakdown,
    correctCount,
  };
}
