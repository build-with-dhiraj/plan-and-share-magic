import { RotateCcw, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { XPStreakWidget } from "@/components/gamification/XPStreakWidget";

const RevisionPage = () => (
  <div className="container max-w-3xl py-6 px-4">
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Revision</h1>
        <p className="text-sm text-muted-foreground mt-1">Your spaced retrieval queue</p>
      </div>
      <XPStreakWidget streak={7} xp={340} />
    </div>

    <Card className="glass-card mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <RotateCcw className="h-4 w-4 text-accent" />
          Today's Queue
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">12 cards due for review</p>
        <Button className="w-full bg-primary text-primary-foreground">
          <Flame className="h-4 w-4 mr-2" /> Start Review Session
        </Button>
      </CardContent>
    </Card>

    <div className="grid grid-cols-3 gap-3">
      {[
        { label: "Due Today", value: "12", color: "text-accent" },
        { label: "Reviewed", value: "5", color: "text-gs-economy" },
        { label: "Mastered", value: "28", color: "text-gs-polity" },
      ].map((stat) => (
        <Card key={stat.label} className="glass-card text-center p-4">
          <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
          <p className="text-xs text-muted-foreground">{stat.label}</p>
        </Card>
      ))}
    </div>
  </div>
);

export default RevisionPage;
