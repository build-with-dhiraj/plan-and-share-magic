import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Target } from "lucide-react";

const PracticePage = () => (
  <div className="container max-w-3xl py-6 px-4">
    <h1 className="text-2xl font-bold text-foreground tracking-tight mb-1">Practice</h1>
    <p className="text-sm text-muted-foreground mb-6">MCQ drills in UPSC format</p>

    <Card className="glass-card mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Target className="h-4 w-4 text-accent" /> Quick Drill
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">10 MCQs from today's issues</p>
        <Button className="w-full bg-primary text-primary-foreground">Start Practice</Button>
      </CardContent>
    </Card>

    <div className="grid grid-cols-2 gap-3">
      {["Polity", "Economy", "Environment", "Science"].map((topic) => (
        <Card key={topic} className="glass-card p-4 cursor-pointer hover:shadow-md transition-shadow">
          <p className="font-medium text-sm text-foreground">{topic}</p>
          <p className="text-xs text-muted-foreground mt-1">24 questions</p>
        </Card>
      ))}
    </div>
  </div>
);

export default PracticePage;
