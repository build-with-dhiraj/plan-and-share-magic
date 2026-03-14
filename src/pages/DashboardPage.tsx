import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Flame, BookOpen, Brain, TrendingUp, Loader2, GraduationCap, Target } from "lucide-react";
import { XPStreakWidget } from "@/components/gamification/XPStreakWidget";
import { StreakCalendar } from "@/components/gamification/StreakCalendar";
import { useDashboardData } from "@/hooks/useDashboardData";
import { fetchPYQDashboardStats, fetchPYQWeakTopics } from "@/hooks/usePYQBank";
import { useAuth } from "@/hooks/useAuth";

const DashboardPage = () => {
  const data = useDashboardData();
  const { user } = useAuth();
  const [pyqStats, setPyqStats] = useState({ totalSolved: 0, totalCorrect: 0, totalAttempts: 0, prelimsAccuracy: 0, mainsAttempted: 0, totalXP: 0 });
  const [pyqWeakTopics, setPyqWeakTopics] = useState<{ topic: string; accuracy: number }[]>([]);

  useEffect(() => {
    if (user) {
      fetchPYQDashboardStats(user.id).then(setPyqStats);
      fetchPYQWeakTopics(user.id).then(setPyqWeakTopics);
    }
  }, [user]);

  const coveragePercent = (() => {
    const topics = Object.values(data.topicCoverage);
    if (topics.length === 0) return 0;
    const total = topics.reduce((s, t) => s + t.total, 0);
    const correct = topics.reduce((s, t) => s + t.correct, 0);
    return total > 0 ? Math.round((correct / total) * 100) : 0;
  })();

  const statsCards = [
    { label: "Quizzes Done", value: data.loading ? "…" : String(data.quizzesCompleted), icon: BookOpen, color: "text-gs-polity" },
    { label: "Facts Recalled", value: data.loading ? "…" : String(data.factsRecalled), icon: Brain, color: "text-gs-economy" },
    { label: "Streak", value: data.loading ? "…" : `${data.currentStreak} days`, icon: Flame, color: "text-accent" },
    { label: "Accuracy", value: data.loading ? "…" : `${coveragePercent}%`, icon: TrendingUp, color: "text-gs-science" },
  ];

  return (
    <div className="container max-w-4xl py-4 sm:py-6 px-4 pb-24 lg:pb-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Dashboard</h1>
        <XPStreakWidget />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {statsCards.map((stat) => (
          <Card key={stat.label} className="glass-card">
            <CardContent className="p-4 text-center">
              <stat.icon className={`h-5 w-5 mx-auto mb-2 ${stat.color}`} />
              <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <StreakCalendar className="mb-6" activityDays={data.activityDays} loading={data.loading} />

      {/* PYQ Progress */}
      {pyqStats.totalSolved > 0 && (
        <Card className="glass-card mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-green-600" /> PYQ Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-xl font-bold text-foreground">{pyqStats.totalSolved}</p>
                <p className="text-xs text-muted-foreground">PYQs Solved</p>
              </div>
              <div>
                <p className="text-xl font-bold text-green-600">{pyqStats.prelimsAccuracy}%</p>
                <p className="text-xs text-muted-foreground">Prelims Acc.</p>
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">{pyqStats.mainsAttempted}</p>
                <p className="text-xs text-muted-foreground">Mains Tried</p>
              </div>
            </div>

            {/* PYQ vs Practice Accuracy comparison */}
            {coveragePercent > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>PYQ Accuracy</span>
                  <span>{pyqStats.prelimsAccuracy}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full" style={{ width: `${pyqStats.prelimsAccuracy}%` }} />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Practice Accuracy</span>
                  <span>{coveragePercent}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-accent rounded-full" style={{ width: `${coveragePercent}%` }} />
                </div>
              </div>
            )}

            {/* Weak PYQ Topics */}
            {pyqWeakTopics.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-1.5">Weak PYQ Topics</p>
                <div className="flex flex-wrap gap-1.5">
                  {pyqWeakTopics.slice(0, 5).map(({ topic, accuracy }) => (
                    <span key={topic} className="text-xs px-2 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/20">
                      {topic} ({accuracy}%)
                    </span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Topic Coverage */}
      {Object.keys(data.topicCoverage).length > 0 && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base">Topic Performance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(data.topicCoverage).map(([topic, { correct, total }]) => {
              const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
              return (
                <div key={topic} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-foreground font-medium">{topic}</span>
                    <span className="text-muted-foreground">{correct}/{total} ({pct}%)</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DashboardPage;
