import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Flame, BookOpen, Brain, TrendingUp, Loader2 } from "lucide-react";
import { XPStreakWidget } from "@/components/gamification/XPStreakWidget";
import { StreakCalendar } from "@/components/gamification/StreakCalendar";
import { useDashboardData } from "@/hooks/useDashboardData";

const DashboardPage = () => {
  const data = useDashboardData();

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
    <div className="container max-w-4xl py-6 px-4 pb-24 lg:pb-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Dashboard</h1>
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
