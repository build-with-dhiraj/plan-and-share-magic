import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Flame, BookOpen, Brain, TrendingUp } from "lucide-react";
import { XPStreakWidget } from "@/components/gamification/XPStreakWidget";
import { StreakCalendar } from "@/components/gamification/StreakCalendar";

const DashboardPage = () => (
  <div className="container max-w-4xl py-6 px-4 pb-24 lg:pb-6">
    <div className="flex items-center justify-between mb-6">
      <h1 className="text-2xl font-bold text-foreground tracking-tight">Dashboard</h1>
      <XPStreakWidget streak={7} xp={340} />
    </div>

    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      {[
        { label: "Issues Read", value: "42", icon: BookOpen, color: "text-gs-polity" },
        { label: "Facts Recalled", value: "128", icon: Brain, color: "text-gs-economy" },
        { label: "Streak", value: "7 days", icon: Flame, color: "text-accent" },
        { label: "Coverage", value: "58%", icon: TrendingUp, color: "text-gs-science" },
      ].map((stat) => (
        <Card key={stat.label} className="glass-card">
          <CardContent className="p-4 text-center">
            <stat.icon className={`h-5 w-5 mx-auto mb-2 ${stat.color}`} />
            <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </CardContent>
        </Card>
      ))}
    </div>

    {/* Streak Calendar */}
    <StreakCalendar className="mb-6" />

    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-base">Syllabus Coverage</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Coverage radar chart will be rendered here with live data</p>
      </CardContent>
    </Card>
  </div>
);

export default DashboardPage;
