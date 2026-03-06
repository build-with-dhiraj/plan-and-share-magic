import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Palette, Target } from "lucide-react";

const SettingsPage = () => (
  <div className="container max-w-3xl py-6 px-4">
    <h1 className="text-2xl font-bold text-foreground tracking-tight mb-6">Settings</h1>

    <div className="space-y-4">
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4 text-accent" /> Profile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Sign in to sync your progress across devices</p>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4 text-accent" /> Exam Target
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Set your target exam year and optional subjects</p>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Palette className="h-4 w-4 text-accent" /> Appearance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Theme preferences and reading settings</p>
        </CardContent>
      </Card>
    </div>
  </div>
);

export default SettingsPage;
