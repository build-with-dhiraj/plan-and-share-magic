import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Palette, Target, Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

const SettingsPage = () => {
  const { theme, setTheme } = useTheme();

  const themeOptions = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ];

  return (
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
            <div className="flex gap-2">
              {themeOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setTheme(opt.value)}
                  className={cn(
                    "flex-1 flex flex-col items-center gap-1.5 rounded-lg border p-3 transition-all",
                    theme === opt.value
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-border text-muted-foreground hover:border-accent/50"
                  )}
                >
                  <opt.icon className="h-4 w-4" />
                  <span className="text-xs font-medium">{opt.label}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SettingsPage;
